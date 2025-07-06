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
            label: 'Replace all bookmarks',
            description:
              'Remove all existing bookmarks and collections, then import',
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
        this.bookmarkManager.clearAllBookmarks();
        this.collectionManager.clearAllCollections();
      }

      // Import collections first
      let importedCollections = 0;
      for (const collectionData of importData.collections) {
        try {
          // Assign collection to current workspace since workspaceId is omitted from exports
          const currentWorkspaceId =
            vscode.workspace.workspaceFolders?.[0]?.uri.toString();

          const collection = new Collection(
            collectionData.name,
            currentWorkspaceId, // Use current workspace instead of imported workspaceId
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

      // Import bookmarks
      let importedBookmarks = 0;
      for (const bookmarkData of importData.bookmarks) {
        try {
          // Convert relative path to absolute URI
          const absoluteUri = this.makeUriAbsolute(bookmarkData.uri);

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
      const message =
        importOption.value === 'replace'
          ? `Import completed! Imported ${importedBookmarks} bookmarks and ${importedCollections} collections.`
          : `Import completed! Added ${importedBookmarks} new bookmarks and ${importedCollections} new collections.`;

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
