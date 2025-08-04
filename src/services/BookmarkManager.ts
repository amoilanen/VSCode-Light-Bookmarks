import { Bookmark } from '../models/Bookmark';
import { CollectionManager } from './CollectionManager';
import * as vscode from 'vscode';
import { localize } from './LocalizationService';

export class BookmarkManager {
  private bookmarks: Bookmark[] = [];
  private onBookmarksChanged: (() => void) | null = null;
  private collectionManager: CollectionManager;

  constructor(collectionManager: CollectionManager) {
    this.collectionManager = collectionManager;
  }

  public addBookmark(
    uri: string,
    line: number,
    collectionId?: string,
    description?: string
  ): Bookmark | null {
    // Check if bookmark already exists
    const existingBookmark = this.bookmarks.find(
      b => b.uri === uri && b.line === line
    );
    if (existingBookmark) {
      return null;
    }

    // Check max bookmarks per file setting
    const maxBookmarksPerFile = vscode.workspace
      .getConfiguration('lightBookmarks')
      .get<number>('maxBookmarksPerFile', 100);
    const bookmarksInFile = this.bookmarks.filter(b => b.uri === uri).length;

    if (bookmarksInFile >= maxBookmarksPerFile) {
      vscode.window.showWarningMessage(
        localize('message.maxBookmarksReached', maxBookmarksPerFile.toString())
      );
      return null;
    }

    // Ensure the "Ungrouped" collection exists if we're adding to it
    const realCollectionId = collectionId || 'ungrouped-bookmarks';
    if (realCollectionId === 'ungrouped-bookmarks') {
      const workspaceId =
        vscode.workspace.workspaceFolders?.[0]?.uri.toString();
      this.collectionManager.ensureUngroupedCollection(workspaceId);
    }

    const bookmark = new Bookmark(uri, line, realCollectionId, description);

    // Assign order value based on existing bookmarks in the collection
    const collectionBookmarks = this.getBookmarksByCollection(realCollectionId);
    bookmark.order = collectionBookmarks.length * 10;

    this.bookmarks.push(bookmark);
    this.notifyBookmarksChanged();
    return bookmark;
  }

  public updateBookmarkDescription(
    uri: string,
    line: number,
    description: string
  ): boolean {
    const bookmark = this.bookmarks.find(b => b.uri === uri && b.line === line);
    if (!bookmark) {
      return false;
    }

    bookmark.description = description;
    this.notifyBookmarksChanged();
    return true;
  }

  public getBookmarkDescription(uri: string, line: number): string | undefined {
    const bookmark = this.bookmarks.find(b => b.uri === uri && b.line === line);
    return bookmark?.description;
  }

  public removeBookmark(uri: string, line: number): boolean {
    const index = this.bookmarks.findIndex(
      b => b.uri === uri && b.line === line
    );
    if (index === -1) {
      return false;
    }

    this.bookmarks.splice(index, 1);
    this.notifyBookmarksChanged();
    return true;
  }

  public toggleBookmark(
    uri: string,
    line: number,
    collectionId?: string
  ): Bookmark | null {
    const existingBookmark = this.bookmarks.find(
      b => b.uri === uri && b.line === line
    );

    if (existingBookmark) {
      this.removeBookmark(uri, line);
      return null;
    } else {
      return this.addBookmark(uri, line, collectionId || 'ungrouped-bookmarks');
    }
  }

  public getBookmarksByUri(uri: string): Bookmark[] {
    return this.bookmarks.filter(b => b.uri === uri);
  }

  public getBookmarksByCollection(collectionId: string): Bookmark[] {
    const bookmarks = this.bookmarks.filter(
      b => b.collectionId === collectionId
    );
    // Sort by order, then by creation date for consistent ordering
    return bookmarks.sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  public getAllBookmarks(): Bookmark[] {
    return [...this.bookmarks];
  }

  public getBookmarksForCurrentWorkspace(): Bookmark[] {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return [];
    }

    return this.bookmarks.filter(bookmark =>
      this.isBookmarkInCurrentWorkspace(bookmark)
    );
  }

  public clearAllBookmarks(): void {
    this.bookmarks = [];
    this.notifyBookmarksChanged();
  }

  public clearBookmarksForWorkspace(_workspaceId?: string): void {
    // Remove bookmarks that belong to the current workspace based on their file path
    this.bookmarks = this.bookmarks.filter(bookmark => {
      return !this.isBookmarkInCurrentWorkspace(bookmark);
    });

    this.notifyBookmarksChanged();
  }

  private isBookmarkInCurrentWorkspace(bookmark: Bookmark): boolean {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      // If no workspace is open, do not show any bookmarks
      return false;
    }

    try {
      const bookmarkUri = vscode.Uri.parse(bookmark.uri);

      // Check if the bookmark URI is within any of the current workspace folders
      return workspaceFolders.some(folder => {
        const folderPath = folder.uri.fsPath;
        const bookmarkPath = bookmarkUri.fsPath;
        return bookmarkPath.startsWith(folderPath);
      });
    } catch (error) {
      // If we can't parse the URI, assume it's not in the current workspace
      return false;
    }
  }

  public hasBookmark(uri: string, line: number): boolean {
    return this.bookmarks.some(b => b.uri === uri && b.line === line);
  }

  public getBookmark(uri: string, line: number): Bookmark | undefined {
    return this.bookmarks.find(b => b.uri === uri && b.line === line);
  }

  public setOnBookmarksChanged(callback: () => void): void {
    this.onBookmarksChanged = callback;
  }

  private notifyBookmarksChanged(): void {
    if (this.onBookmarksChanged) {
      this.onBookmarksChanged();
    }
  }

  public moveBookmarkUp(uri: string, line: number): boolean {
    const bookmark = this.bookmarks.find(b => b.uri === uri && b.line === line);
    if (!bookmark || !bookmark.collectionId) {
      return false;
    }

    const collectionBookmarks = this.getBookmarksByCollection(
      bookmark.collectionId
    );
    const currentIndex = collectionBookmarks.findIndex(
      b => b.uri === uri && b.line === line
    );

    if (currentIndex <= 0) {
      return false; // Already at the top
    }

    // Swap order values
    const previousBookmark = collectionBookmarks[currentIndex - 1];
    const tempOrder = bookmark.order;
    bookmark.order = previousBookmark.order;
    previousBookmark.order = tempOrder;

    // Re-normalize order values
    collectionBookmarks.sort((a, b) => a.order - b.order);
    collectionBookmarks.forEach((b, idx) => {
      b.order = idx * 10;
    });

    this.notifyBookmarksChanged();
    return true;
  }

  public moveBookmarkDown(uri: string, line: number): boolean {
    const bookmark = this.bookmarks.find(b => b.uri === uri && b.line === line);
    if (!bookmark || !bookmark.collectionId) {
      return false;
    }

    const collectionBookmarks = this.getBookmarksByCollection(
      bookmark.collectionId
    );
    const currentIndex = collectionBookmarks.findIndex(
      b => b.uri === uri && b.line === line
    );

    if (currentIndex === -1 || currentIndex >= collectionBookmarks.length - 1) {
      return false; // Already at the bottom
    }

    // Swap order values
    const nextBookmark = collectionBookmarks[currentIndex + 1];
    const tempOrder = bookmark.order;
    bookmark.order = nextBookmark.order;
    nextBookmark.order = tempOrder;

    // Re-normalize order values
    collectionBookmarks.sort((a, b) => a.order - b.order);
    collectionBookmarks.forEach((b, idx) => {
      b.order = idx * 10;
    });

    this.notifyBookmarksChanged();
    return true;
  }

  public updateBookmarksForDocumentChanges(
    uri: string,
    contentChanges: readonly vscode.TextDocumentContentChangeEvent[]
  ): { removed: number; updated: number } {
    const bookmarksInFile = this.getBookmarksByUri(uri);

    if (bookmarksInFile.length === 0) {
      return { removed: 0, updated: 0 }; // No bookmarks in this file
    }

    const bookmarksToRemove: Array<{ uri: string; line: number }> = [];
    const bookmarksToUpdate: Array<{
      uri: string;
      oldLine: number;
      newLine: number;
    }> = [];

    // Process each change in the document
    for (const change of contentChanges) {
      const changeStartLine = change.range.start.line;
      const changeEndLine = change.range.end.line;
      const linesRemoved = changeEndLine - changeStartLine;
      const linesAdded =
        change.text === '' ? 0 : change.text.split('\n').length - 1;

      // Find bookmarks that are affected by this change
      for (const bookmark of bookmarksInFile) {
        const bookmarkLine = bookmark.line;

        if (bookmarkLine < changeStartLine) {
          // Bookmark is before the change, no action needed
          continue;
        }

        if (bookmarkLine >= changeStartLine && bookmarkLine <= changeEndLine) {
          // Bookmark is within the deleted range - remove it
          bookmarksToRemove.push({ uri: bookmark.uri, line: bookmark.line });
        } else if (bookmarkLine > changeEndLine) {
          // Bookmark is after the change - update its line number
          const newLine = bookmarkLine - linesRemoved + linesAdded;
          if (newLine >= 0) {
            bookmarksToUpdate.push({
              uri: bookmark.uri,
              oldLine: bookmark.line,
              newLine: newLine,
            });
          } else {
            // If new line would be negative, remove the bookmark
            bookmarksToRemove.push({ uri: bookmark.uri, line: bookmark.line });
          }
        }
      }
    }

    // Remove bookmarks that are no longer valid
    for (const bookmark of bookmarksToRemove) {
      this.removeBookmark(bookmark.uri, bookmark.line);
    }

    // Update line numbers for bookmarks that moved
    for (const update of bookmarksToUpdate) {
      const bookmark = this.getBookmark(update.uri, update.oldLine);
      if (bookmark) {
        // Remove the old bookmark
        this.removeBookmark(update.uri, update.oldLine);
        // Add the bookmark at the new line
        this.addBookmark(
          update.uri,
          update.newLine,
          bookmark.collectionId,
          bookmark.description
        );
      }
    }

    return {
      removed: bookmarksToRemove.length,
      updated: bookmarksToUpdate.length,
    };
  }
}
