import * as vscode from 'vscode';
import { CollectionManager } from '../services/CollectionManager';
import { BookmarkManager } from '../services/BookmarkManager';
import { StorageService } from '../services/StorageService';
import { BookmarkTreeDataProvider } from '../providers/BookmarkTreeDataProvider';
import { BookmarkDecorationProvider } from '../providers/BookmarkDecorationProvider';
import { localize } from '../services/LocalizationService';

export class DeleteCollectionCommand {
  constructor(
    private collectionManager: CollectionManager,
    private bookmarkManager: BookmarkManager,
    private storageService: StorageService,
    private treeDataProvider: BookmarkTreeDataProvider,
    private decorationProvider: BookmarkDecorationProvider
  ) {}

  public async execute(collectionId: string): Promise<void> {
    const collection = this.collectionManager.getCollection(collectionId);
    if (!collection) {
      vscode.window.showErrorMessage(localize('message.collectionNotFound'));
      return;
    }

    // Get bookmarks in this collection
    const bookmarksInCollection =
      this.bookmarkManager.getBookmarksByCollection(collectionId);

    // Special handling for "Ungrouped" collection
    if (collectionId === 'ungrouped-bookmarks') {
      // If empty, delete immediately (will be recreated when needed)
      if (bookmarksInCollection.length === 0) {
        await this.deleteCollection(collectionId, collection);
        return;
      }

      // For "Ungrouped" collection with bookmarks, ask for confirmation with different message
      const result = await vscode.window.showWarningMessage(
        localize('confirm.deleteUngroupedCollection'),
        { modal: true },
        localize('confirm.delete')
      );

      if (result === 'Delete') {
        // Remove all bookmarks in the collection
        bookmarksInCollection.forEach(bookmark => {
          this.bookmarkManager.removeBookmark(bookmark.uri, bookmark.line);
        });

        // Delete the collection
        await this.deleteCollection(collectionId, collection);
      }
      return;
    }

    // For regular collections
    // If collection is empty, delete immediately
    if (bookmarksInCollection.length === 0) {
      await this.deleteCollection(collectionId, collection);
      return;
    }

    // If collection has bookmarks, ask for confirmation
    const result = await vscode.window.showWarningMessage(
      localize('confirm.deleteCollection'),
      { modal: true },
      localize('confirm.delete')
    );

    if (result === 'Delete') {
      // Remove all bookmarks in the collection
      bookmarksInCollection.forEach(bookmark => {
        this.bookmarkManager.removeBookmark(bookmark.uri, bookmark.line);
      });

      // Delete the collection
      await this.deleteCollection(collectionId, collection);
    }
    // If user cancels, do nothing - collection remains unchanged
  }

  private async deleteCollection(
    collectionId: string,
    _collection: { id: string; name: string }
  ): Promise<void> {
    const deleted = this.collectionManager.deleteCollection(collectionId);
    if (deleted) {
      // Save to storage
      await Promise.all([
        this.storageService.saveBookmarks(
          this.bookmarkManager.getAllBookmarks()
        ),
        this.storageService.saveCollections(
          this.collectionManager.getAllCollections()
        ),
      ]);

      // Refresh only the root level to update the tree structure
      // Since the collection was deleted, we only need to refresh the root
      this.treeDataProvider.refreshRoot();

      this.decorationProvider.updateDecorations();
    } else {
      vscode.window.showErrorMessage(
        localize('message.failedToDeleteCollection')
      );
    }
  }
}
