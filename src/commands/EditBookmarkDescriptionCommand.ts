import * as vscode from 'vscode';
import { BookmarkManager } from '../services/BookmarkManager';
import { CollectionManager } from '../services/CollectionManager';
import { StorageService } from '../services/StorageService';
import { BookmarkTreeDataProvider } from '../providers/BookmarkTreeDataProvider';
import { BookmarkDecorationProvider } from '../providers/BookmarkDecorationProvider';
import { BookmarkTreeItem } from '../providers/BookmarkTreeDataProvider';
import { localize } from '../services/LocalizationService';

export class EditBookmarkDescriptionCommand {
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
      // If no tree item provided, try to get from active editor
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage(localize('message.noActiveEditor'));
        return;
      }

      const position = editor.selection.active;
      bookmarkUri = editor.document.uri.toString();
      bookmarkLine = position.line + 1; // Convert to 1-based line number

      // Check if bookmark exists at this location
      if (!this.bookmarkManager.hasBookmark(bookmarkUri, bookmarkLine)) {
        vscode.window.showErrorMessage(
          localize('message.noBookmarkAtCurrentLine')
        );
        return;
      }
    }

    if (!bookmarkUri || bookmarkLine === undefined) {
      vscode.window.showErrorMessage(localize('message.noBookmarkAtLocation'));
      return;
    }

    // Get current description
    const currentDescription =
      this.bookmarkManager.getBookmarkDescription(bookmarkUri, bookmarkLine) ||
      '';

    // Show input box for editing description
    const newDescription = await vscode.window.showInputBox({
      title: localize('prompt.editBookmarkDescription'),
      placeHolder: localize('prompt.enterBookmarkDescription'),
      prompt: localize('prompt.enterBookmarkDescriptionPlaceholder'),
      value: currentDescription,
      validateInput: value => {
        if (value && value.length > 500) {
          return localize('validation.descriptionTooLong');
        }
        return null;
      },
    });

    if (newDescription === undefined) {
      return; // User cancelled
    }

    // Update the bookmark description
    const success = this.bookmarkManager.updateBookmarkDescription(
      bookmarkUri,
      bookmarkLine,
      newDescription
    );

    if (success) {
      // Save to storage
      await this.storageService.saveBookmarks(
        this.bookmarkManager.getAllBookmarks()
      );

      // Refresh the tree view to show updated description
      this.treeDataProvider.refresh();
    } else {
      vscode.window.showErrorMessage(
        localize('message.failedToUpdateBookmark')
      );
    }
  }
}
