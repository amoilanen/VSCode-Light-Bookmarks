import * as vscode from 'vscode';
import { BookmarkManager } from '../services/BookmarkManager';
import { CollectionManager } from '../services/CollectionManager';
import { StorageService } from '../services/StorageService';
import { BookmarkTreeDataProvider } from '../providers/BookmarkTreeDataProvider';
import { BookmarkDecorationProvider } from '../providers/BookmarkDecorationProvider';
import { BookmarkTreeItem } from '../providers/BookmarkTreeDataProvider';

export class AddBookmarkToCollectionCommand {
  constructor(
    private bookmarkManager: BookmarkManager,
    private collectionManager: CollectionManager,
    private storageService: StorageService,
    private treeDataProvider: BookmarkTreeDataProvider,
    private decorationProvider: BookmarkDecorationProvider
  ) {}

  public async execute(treeItem?: BookmarkTreeItem): Promise<void> {
    let bookmarkUri: string | undefined;
    let bookmarkLine: number | undefined;

    if (treeItem?.bookmark) {
      bookmarkUri = treeItem.bookmark.uri;
      bookmarkLine = treeItem.bookmark.line;
    } else {
      // Fallback to active editor if no tree item provided
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor found');
        return;
      }
      bookmarkUri = editor.document.uri.toString();
      bookmarkLine = editor.selection.active.line + 1;
    }

    // Check if there's already a bookmark at this location
    const existingBookmark = this.bookmarkManager.getBookmark(bookmarkUri, bookmarkLine);
    if (!existingBookmark) {
      vscode.window.showInformationMessage('No bookmark found at the specified location.');
      return;
    }

    // Get available collections (excluding the current one if bookmark is already in a collection)
    const currentWorkspaceId = vscode.workspace.workspaceFolders?.[0]?.uri.toString();
    const allCollections = this.collectionManager.getCollectionsForWorkspace(currentWorkspaceId);
    const availableCollections = allCollections.filter(collection => 
      collection.id !== existingBookmark.collectionId
    );

    // Show collection picker
    const collectionOptions = availableCollections.map(c => ({ label: c.name, id: c.id }));

    if (collectionOptions.length === 0) {
      vscode.window.showInformationMessage('No other collections available. Please create a collection first.');
      return;
    }

    const selectedOption = await vscode.window.showQuickPick(collectionOptions, {
      placeHolder: 'Select a collection to add the bookmark to'
    });

    if (!selectedOption) {
      return; // User cancelled
    }

    // Remove the existing bookmark and add it to the new collection
    const description = existingBookmark.description;
    this.bookmarkManager.removeBookmark(bookmarkUri, bookmarkLine);
    let newBookmark;
    newBookmark = this.bookmarkManager.addBookmark(bookmarkUri, bookmarkLine, selectedOption.id, description);

    if (newBookmark) {
      const message = selectedOption.id === 'ungrouped-bookmarks' 
        ? 'Bookmark moved to ungrouped'
        : `Bookmark moved to collection "${selectedOption.label}"`;
      vscode.window.showInformationMessage(message);
      // Save to storage
      await this.storageService.saveBookmarks(this.bookmarkManager.getAllBookmarks());
      // Refresh only the relevant parts of the tree
      const collection = this.collectionManager.getCollection(newBookmark.collectionId || 'ungrouped-bookmarks');
      if (collection) {
        this.treeDataProvider.refreshCollection(collection);
      }
      // Also refresh root to update counts
      this.treeDataProvider.refreshRoot();
      // Update decorations for the current editor if it's the same file
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.uri.toString() === bookmarkUri) {
        this.decorationProvider.updateDecorations(editor);
      }
    }
  }
} 