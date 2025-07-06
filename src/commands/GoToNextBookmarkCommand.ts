import * as vscode from 'vscode';
import { BookmarkManager } from '../services/BookmarkManager';
import { Bookmark } from '../models/Bookmark';

export class GoToNextBookmarkCommand {
  private bookmarkManager: BookmarkManager;

  constructor(bookmarkManager: BookmarkManager) {
    this.bookmarkManager = bookmarkManager;
  }

  public async execute(): Promise<void> {
    // Get all bookmarks across all files
    const allBookmarks = this.bookmarkManager.getAllBookmarks();

    if (allBookmarks.length === 0) {
      vscode.window.showInformationMessage('No bookmarks found');
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
    let nextBookmark: Bookmark | undefined;

    if (!activeEditor) {
      // No active editor - go to the first bookmark
      nextBookmark = sortedBookmarks[0];
    } else {
      const currentUri = activeEditor.document.uri.toString();
      const currentLine = activeEditor.selection.active.line + 1; // Convert to 1-based for comparison

      // Find the next bookmark after the current position
      nextBookmark = sortedBookmarks.find(bookmark => {
        if (bookmark.uri !== currentUri) {
          return bookmark.uri > currentUri;
        }
        return bookmark.line > currentLine;
      });

      // If no next bookmark found in current file or later files, wrap to the first bookmark
      if (!nextBookmark) {
        nextBookmark = sortedBookmarks[0];
      }

      // Show wrap message if we wrapped to the first bookmark
      if (
        nextBookmark === sortedBookmarks[0] &&
        (nextBookmark.uri < currentUri ||
          (nextBookmark.uri === currentUri && nextBookmark.line <= currentLine))
      ) {
        vscode.window.showInformationMessage('Wrapped to first bookmark');
      }
    }

    // Navigate to the next bookmark
    if (nextBookmark) {
      await this.navigateToBookmark(nextBookmark);
    }
  }

  private async navigateToBookmark(bookmark: Bookmark): Promise<void> {
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
      vscode.window.showErrorMessage(`Failed to open bookmark: ${error}`);
    }
  }
}
