import * as vscode from 'vscode';
import { BookmarkManager } from '../services/BookmarkManager';
import { CollectionManager } from '../services/CollectionManager';
import { StorageService } from '../services/StorageService';
import { BookmarkTreeDataProvider } from '../providers/BookmarkTreeDataProvider';
import { BookmarkDecorationProvider } from '../providers/BookmarkDecorationProvider';
import { localize } from '../services/LocalizationService';

export class ToggleBookmarkCommand {
  constructor(
    private bookmarkManager: BookmarkManager,
    private collectionManager: CollectionManager,
    private storageService: StorageService,
    private treeDataProvider: BookmarkTreeDataProvider,
    private decorationProvider: BookmarkDecorationProvider
  ) {}

  private generateDescriptionFromCodeLine(
    document: vscode.TextDocument,
    lineNumber: number
  ): string {
    try {
      const line = document.lineAt(lineNumber);
      const codeLine = line.text.trim();

      // Take first 80 characters and trim trailing whitespace
      let description = codeLine.substring(0, 80).trim();

      // If the line was truncated, add ellipsis
      if (codeLine.length > 80) {
        description += '...';
      }

      return description;
    } catch (error) {
      return '';
    }
  }

  public async execute(params?: {
    lineNumber: number;
    uri: vscode.Uri;
  }): Promise<void> {
    let editor: vscode.TextEditor | undefined;
    let uri: string;
    let line: number;

    if (params) {
      uri = params.uri.toString();
      line = params.lineNumber;
      editor = vscode.window.visibleTextEditors.find(
        e => e.document.uri.toString() === uri
      );
      if (!editor) {
        vscode.window.showInformationMessage(
          localize('message.noActiveEditor')
        );
        return;
      }
    } else {
      editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage(
          localize('message.noActiveEditor')
        );
        return;
      }
      uri = editor.document.uri.toString();
      line = editor.selection.active.line + 1; // Convert to 1-based line number
    }

    const existingBookmark = this.bookmarkManager.getBookmark(uri, line);

    if (existingBookmark) {
      // Remove existing bookmark
      const success = this.bookmarkManager.removeBookmark(uri, line);
      if (success) {
        // Save to storage
        await this.storageService.saveBookmarks(
          this.bookmarkManager.getAllBookmarks()
        );

        // Refresh only the relevant parts of the tree
        if (existingBookmark.collectionId) {
          // Bookmark was removed from a collection, refresh that collection
          const collection = this.collectionManager.getCollection(
            existingBookmark.collectionId
          );
          if (collection) {
            this.treeDataProvider.refreshCollection(collection);
          }
        }
        // Also refresh root to update counts
        this.treeDataProvider.refreshRoot();
      }
    } else {
      // Add new bookmark with generated description
      const description = this.generateDescriptionFromCodeLine(
        editor.document,
        line - 1
      );
      const bookmark = this.bookmarkManager.addBookmark(
        uri,
        line,
        undefined,
        description
      );

      if (bookmark) {
        // Save to storage
        await this.storageService.saveBookmarks(
          this.bookmarkManager.getAllBookmarks()
        );

        // Refresh only the relevant parts of the tree
        if (bookmark.collectionId) {
          // Bookmark was added to a collection, refresh that collection
          const collection = this.collectionManager.getCollection(
            bookmark.collectionId
          );
          if (collection) {
            this.treeDataProvider.refreshCollection(collection);
          }
        }
        // Also refresh root to update counts
        this.treeDataProvider.refreshRoot();
      }
      // Note: If bookmark is null, the BookmarkManager already showed a warning message
    }

    this.decorationProvider.updateDecorations(editor);
  }
}
