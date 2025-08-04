import * as vscode from 'vscode';
import { BookmarkManager } from '../services/BookmarkManager';
import { CollectionManager } from '../services/CollectionManager';
import { StorageService } from '../services/StorageService';
import { BookmarkTreeDataProvider } from '../providers/BookmarkTreeDataProvider';
import { BookmarkDecorationProvider } from '../providers/BookmarkDecorationProvider';
import { Collection } from '../models/Collection';

interface ImportData {
  version: string;
  exportDate: string;
  bookmarks: Array<{
    uri: string;
    line: number;
    description?: string;
    collectionId?: string;
    order?: number;
    createdAt: string;
  }>;
  collections: Array<{
    id: string;
    name: string;
    workspaceId?: string;
    order?: number;
    createdAt: string;
  }>;
}

export class ImportBookmarksCommand {
  constructor(
    private bookmarkManager: BookmarkManager,
    private collectionManager: CollectionManager,
    private storageService: StorageService,
    private treeDataProvider: BookmarkTreeDataProvider,
    private decorationProvider: BookmarkDecorationProvider
  ) {}

  public async execute(): Promise<void> {
    try {
      // Show open dialog
      const openUri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          'JSON Files': ['json'],
          'All Files': ['*'],
        },
        title: 'Import Bookmarks',
      });

      if (!openUri || openUri.length === 0) {
        return; // User cancelled
      }

      // Read and parse the file
      const fileContent = await vscode.workspace.fs.readFile(openUri[0]);
      const jsonContent = Buffer.from(fileContent).toString('utf8');

      let importData: ImportData;
      try {
        importData = JSON.parse(jsonContent);
      } catch (parseError) {
        vscode.window.showErrorMessage('Invalid JSON file format');
        return;
      }

      // Validate the import data structure
      if (!this.validateImportData(importData)) {
        vscode.window.showErrorMessage('Invalid bookmark export file format');
        return;
      }

      // Ask user for import options
      const importOption = await vscode.window.showQuickPick(
        [
          {
            label: 'Replace bookmarks in current workspace',
            description:
              'Remove all existing bookmarks and collections in current workspace, then import',
            value: 'replace',
          },
          {
            label: 'Merge with existing bookmarks',
            description:
              'Add imported bookmarks to existing ones (duplicates may occur)',
            value: 'merge',
          },
        ],
        {
          title: 'Import Options',
          placeHolder: 'Choose how to import bookmarks',
        }
      );

      if (!importOption) {
        return; // User cancelled
      }

      // Clear existing data if replace option is selected
      if (importOption.value === 'replace') {
        const currentWorkspaceId = CollectionManager.getCurrentWorkspaceId();
        this.bookmarkManager.clearBookmarksForWorkspace(currentWorkspaceId);
        this.collectionManager.clearCollectionsForWorkspace(currentWorkspaceId);
      }

      // Import collections first - always import to current workspace
      let importedCollections = 0;
      const currentWorkspaceId = CollectionManager.getCurrentWorkspaceId();

      for (const collectionData of importData.collections) {
        try {
          const collection = new Collection(
            collectionData.name,
            currentWorkspaceId, // Always use current workspace
            collectionData.order || 0
          );

          // Override the generated id and createdAt with the imported values
          Object.defineProperty(collection, 'id', {
            value: collectionData.id,
            writable: false,
          });
          Object.defineProperty(collection, 'createdAt', {
            value: new Date(collectionData.createdAt),
            writable: false,
          });

          // Check if collection already exists (for merge mode)
          if (importOption.value === 'merge') {
            const existingCollection = this.collectionManager.getCollection(
              collectionData.id
            );
            if (existingCollection) {
              continue; // Skip duplicate collection
            }
          }

          this.collectionManager.addCollection(collection);
          importedCollections++;
        } catch (error) {
          // Log warning for failed collection import but continue
          vscode.window.showWarningMessage(
            `Failed to import collection ${collectionData.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      // Import bookmarks - only import those that exist in current workspace
      let importedBookmarks = 0;
      let skippedBookmarks = 0;

      for (const bookmarkData of importData.bookmarks) {
        try {
          // Convert relative path to absolute URI
          const absoluteUri = this.makeUriAbsolute(bookmarkData.uri);

          // Check if the file exists in the current workspace
          if (!(await this.fileExistsInCurrentWorkspace(absoluteUri))) {
            skippedBookmarks++;
            continue; // Skip bookmarks for files that don't exist in current workspace
          }

          // Check if bookmark already exists (for merge mode)
          if (importOption.value === 'merge') {
            const existingBookmark = this.bookmarkManager.getBookmark(
              absoluteUri,
              bookmarkData.line
            );
            if (existingBookmark) {
              continue; // Skip duplicate bookmark
            }
          }

          const collectionId =
            bookmarkData.collectionId || 'ungrouped-bookmarks';
          const bookmark = this.bookmarkManager.addBookmark(
            absoluteUri,
            bookmarkData.line,
            collectionId,
            bookmarkData.description
          );

          // Restore the original order and createdAt if they exist
          if (bookmark) {
            if (bookmarkData.order !== undefined) {
              bookmark.order = bookmarkData.order;
            }
            if (bookmarkData.createdAt) {
              Object.defineProperty(bookmark, 'createdAt', {
                value: new Date(bookmarkData.createdAt),
                writable: false,
              });
            }
            importedBookmarks++;
          }
        } catch (error) {
          // Log warning for failed bookmark import but continue
          vscode.window.showWarningMessage(
            `Failed to import bookmark ${bookmarkData.uri}:${bookmarkData.line}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      // Save imported data
      await Promise.all([
        this.storageService.saveBookmarks(
          this.bookmarkManager.getAllBookmarks()
        ),
        this.storageService.saveCollections(
          this.collectionManager.getAllCollections()
        ),
      ]);

      // Refresh UI
      this.treeDataProvider.refresh();
      this.decorationProvider.updateDecorations();

      // Show success message
      let message = '';
      if (importOption.value === 'replace') {
        message = `Import completed! Replaced bookmarks in current workspace with ${importedBookmarks} bookmarks and ${importedCollections} collections.`;
      } else {
        message = `Import completed! Added ${importedBookmarks} new bookmarks and ${importedCollections} new collections.`;
      }

      // Add information about skipped bookmarks if any were skipped
      if (skippedBookmarks > 0) {
        message += ` ${skippedBookmarks} bookmarks were skipped because their files don't exist in the current workspace.`;
      }

      vscode.window.showInformationMessage(message);
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to import bookmarks: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Converts a relative path to an absolute URI based on the current workspace folder
   */
  private makeUriAbsolute(uriOrPath: string): string {
    try {
      // If it's already an absolute URI (contains scheme), return as-is
      if (uriOrPath.includes('://')) {
        return uriOrPath;
      }

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        // No workspace folder, assume it's already absolute or create a file URI
        if (uriOrPath.startsWith('/')) {
          return vscode.Uri.file(uriOrPath).toString();
        }
        // Return as-is if we can't determine how to handle it
        return uriOrPath;
      }

      // Use the first workspace folder as the base
      const workspaceUri = workspaceFolders[0].uri;

      // Create an absolute URI by joining the workspace URI with the relative path
      const absoluteUri = vscode.Uri.joinPath(workspaceUri, uriOrPath);

      return absoluteUri.toString();
    } catch (error) {
      // If URI creation fails, return as-is
      return uriOrPath;
    }
  }

  /**
   * Checks if a file exists in the current workspace
   */
  private async fileExistsInCurrentWorkspace(uri: string): Promise<boolean> {
    try {
      // If it's already an absolute URI (contains scheme), parse it directly
      if (uri.includes('://')) {
        const fileUri = vscode.Uri.parse(uri);
        try {
          await vscode.workspace.fs.stat(fileUri);
          return true;
        } catch (statError) {
          // File doesn't exist
          return false;
        }
      }

      // For relative paths, check if we have workspace folders
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        // No workspace folders, assume the file exists (for backward compatibility)
        return true;
      }

      // Convert relative path to absolute URI using the first workspace folder
      const workspaceUri = workspaceFolders[0].uri;
      const absoluteUri = vscode.Uri.joinPath(workspaceUri, uri);

      try {
        await vscode.workspace.fs.stat(absoluteUri);
        return true;
      } catch (statError) {
        // File doesn't exist
        return false;
      }
    } catch (error) {
      // URI parsing failed or other error
      return false;
    }
  }

  private validateImportData(data: unknown): data is ImportData {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const obj = data as Record<string, unknown>;

    return (
      'version' in obj &&
      'exportDate' in obj &&
      'bookmarks' in obj &&
      'collections' in obj &&
      typeof obj.version === 'string' &&
      typeof obj.exportDate === 'string' &&
      Array.isArray(obj.bookmarks) &&
      Array.isArray(obj.collections) &&
      (obj.bookmarks as unknown[]).every(
        (bookmark: unknown) =>
          bookmark &&
          typeof bookmark === 'object' &&
          'uri' in bookmark &&
          'line' in bookmark &&
          'createdAt' in bookmark &&
          typeof (bookmark as Record<string, unknown>).uri === 'string' &&
          typeof (bookmark as Record<string, unknown>).line === 'number' &&
          typeof (bookmark as Record<string, unknown>).createdAt === 'string'
      ) &&
      (obj.collections as unknown[]).every(
        (collection: unknown) =>
          collection &&
          typeof collection === 'object' &&
          'id' in collection &&
          'name' in collection &&
          'createdAt' in collection &&
          typeof (collection as Record<string, unknown>).id === 'string' &&
          typeof (collection as Record<string, unknown>).name === 'string' &&
          typeof (collection as Record<string, unknown>).createdAt === 'string'
      )
    );
  }
}
