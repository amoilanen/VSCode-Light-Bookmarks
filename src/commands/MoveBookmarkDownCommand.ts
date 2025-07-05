import * as vscode from 'vscode';
import { BookmarkManager } from '../services/BookmarkManager';
import { CollectionManager } from '../services/CollectionManager';
import { StorageService } from '../services/StorageService';
import { BookmarkTreeDataProvider } from '../providers/BookmarkTreeDataProvider';
import { BookmarkTreeItem } from '../providers/BookmarkTreeDataProvider';
import { Collection } from '../models/Collection';

export class MoveBookmarkDownCommand {
  constructor(
    private bookmarkManager: BookmarkManager,
    private storageService: StorageService,
    private treeDataProvider: BookmarkTreeDataProvider,
    private collectionManager: CollectionManager
  ) {}

  public async execute(treeItem?: BookmarkTreeItem): Promise<void> {
    let bookmarkUri: string | undefined;
    let bookmarkLine: number | undefined;

    if (treeItem?.bookmark) {
      bookmarkUri = treeItem.bookmark.uri;
      bookmarkLine = treeItem.bookmark.line;
    }

    if (!bookmarkUri || bookmarkLine === undefined) {
      vscode.window.showInformationMessage('No bookmark selected');
      return;
    }

    const success = this.bookmarkManager.moveBookmarkDown(bookmarkUri, bookmarkLine);
    
    if (success) {
      // Save to storage
      await this.storageService.saveBookmarks(this.bookmarkManager.getAllBookmarks());
      
      // Refresh the root to reflect the new order while preserving expanded state
      this.treeDataProvider.refreshRoot();
    } else {
      vscode.window.showInformationMessage('Bookmark is already at the bottom or cannot be moved');
    }
  }
} 