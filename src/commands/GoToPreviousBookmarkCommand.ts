import * as vscode from 'vscode';
import { BookmarkManager } from '../services/BookmarkManager';
import { Bookmark } from '../models/Bookmark';
import { localize } from '../services/LocalizationService';

export class GoToPreviousBookmarkCommand {
  private bookmarkManager: BookmarkManager;

  constructor(bookmarkManager: BookmarkManager) {
    this.bookmarkManager = bookmarkManager;
  }

  public async execute(): Promise<void> {
    // Get all bookmarks across all files
    const allBookmarks = this.bookmarkManager.getAllBookmarks();

    if (allBookmarks.length === 0) {
      vscode.window.showInformationMessage(
        localize('message.noBookmarksFound')
      );
      return;
    }

    // Sort bookmarks by file URI and line number
    const sortedBookmarks = allBookmarks.sort((a, b) => {
      if (a.uri !== b.uri) {
        return a.uri.localeCompare(b.uri);
      }
      return a.line - b.line;
    });

    const activeEditor = vscode.window.activeTextEditor;
    let previousBookmark: Bookmark | undefined;

    if (!activeEditor) {
      // No active editor - go to the last bookmark
      previousBookmark = sortedBookmarks[sortedBookmarks.length - 1];
    } else {
      const currentUri = activeEditor.document.uri.toString();
      const currentLine = activeEditor.selection.active.line + 1; // Convert to 1-based for comparison

      // Find the previous bookmark before the current position
      previousBookmark = sortedBookmarks
        .filter(bookmark => {
          if (bookmark.uri !== currentUri) {
            return bookmark.uri < currentUri;
          }
          return bookmark.line < currentLine;
        })
        .pop();

      // If no previous bookmark found in current file or earlier files, wrap to the last bookmark
      if (!previousBookmark) {
        previousBookmark = sortedBookmarks[sortedBookmarks.length - 1];
      }

      // Show wrap message if we wrapped to the last bookmark
      if (
        previousBookmark === sortedBookmarks[sortedBookmarks.length - 1] &&
        (previousBookmark.uri > currentUri ||
          (previousBookmark.uri === currentUri &&
            previousBookmark.line >= currentLine))
      ) {
        vscode.window.showInformationMessage(
          localize('message.wrappedToLastBookmark')
        );
      }
    }

    // Navigate to the previous bookmark
    if (previousBookmark) {
      await this.navigateToBookmark(previousBookmark, true);
    }
  }

  private async navigateToBookmark(
    bookmark: Bookmark,
    _showDescription: boolean = true
  ): Promise<void> {
    try {
      const uri = vscode.Uri.parse(bookmark.uri);

      // Open the document
      const document = await vscode.workspace.openTextDocument(uri);

      // Show the document in an editor
      const editor = await vscode.window.showTextDocument(document);

      // Create a new position at the bookmark line (convert from 1-based to 0-based)
      const position = new vscode.Position(bookmark.line - 1, 0);

      // Set the selection to the bookmark line
      const selection = new vscode.Selection(position, position);
      editor.selection = selection;

      // Reveal the line in the editor
      editor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
    } catch (error) {
      vscode.window.showErrorMessage(
        localize(
          'message.failedToOpenBookmark',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }
}
