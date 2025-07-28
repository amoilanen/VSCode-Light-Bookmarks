import * as vscode from 'vscode';
import { BookmarkManager } from '../services/BookmarkManager';
import { CollectionManager } from '../services/CollectionManager';

export class ExportBookmarksCommand {
  constructor(
    private bookmarkManager: BookmarkManager,
    private collectionManager: CollectionManager
  ) {}

  public async execute(): Promise<void> {
    try {
      // Get all bookmarks and collections
      const allBookmarks = this.bookmarkManager.getAllBookmarks();
      const allCollections = this.collectionManager.getAllCollections();

      // Create the export data structure
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        bookmarks: allBookmarks.map(bookmark => ({
          uri: this.makeUriRelative(bookmark.uri),
          line: bookmark.line,
          description: bookmark.description,
          collectionId: bookmark.collectionId,
          order: bookmark.order,
          createdAt: bookmark.createdAt,
        })),
        collections: allCollections.map(collection => ({
          id: collection.id,
          name: collection.name,
          workspaceId: collection.workspaceId, // Export relative workspace ID for portability
          order: collection.order,
          createdAt: collection.createdAt,
        })),
      };

      // Show save dialog
      const saveUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(
          `bookmarks-export-${new Date().toISOString().split('T')[0]}.json`
        ),
        filters: {
          'JSON Files': ['json'],
          'All Files': ['*'],
        },
        title: 'Export Bookmarks',
      });

      if (!saveUri) {
        return; // User cancelled
      }

      // Save the file
      const jsonContent = JSON.stringify(exportData, null, 2);
      await vscode.workspace.fs.writeFile(
        saveUri,
        Buffer.from(jsonContent, 'utf8')
      );

      vscode.window
        .showInformationMessage(
          `Bookmarks exported successfully to ${saveUri.path}`,
          'Open File'
        )
        .then(selection => {
          if (selection === 'Open File') {
            vscode.commands.executeCommand('vscode.open', saveUri);
          }
        });
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to export bookmarks: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Converts an absolute URI to a relative path based on the current workspace folder
   */
  private makeUriRelative(absoluteUri: string): string {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        // No workspace folder, return as-is
        return absoluteUri;
      }

      const uri = vscode.Uri.parse(absoluteUri);

      // Find the workspace folder that contains this URI
      for (const workspaceFolder of workspaceFolders) {
        const workspaceUri = workspaceFolder.uri;

        // Check if this URI is within the workspace folder
        if (
          uri.scheme === workspaceUri.scheme &&
          uri.authority === workspaceUri.authority &&
          uri.path.startsWith(workspaceUri.path)
        ) {
          // Make the path relative to the workspace folder
          let relativePath = uri.path.substring(workspaceUri.path.length);

          // Remove leading slash if present
          if (relativePath.startsWith('/')) {
            relativePath = relativePath.substring(1);
          }

          return relativePath;
        }
      }

      // URI is not within any workspace folder, return as-is
      return absoluteUri;
    } catch (error) {
      // If URI parsing fails, return as-is
      return absoluteUri;
    }
  }
}
