import { GoToPreviousBookmarkCommand } from '../../commands/GoToPreviousBookmarkCommand';
import { BookmarkManager } from '../../services/BookmarkManager';
import { CollectionManager } from '../../services/CollectionManager';
import * as vscode from 'vscode';

// Mock vscode
jest.mock('vscode', () => ({
  window: {
    activeTextEditor: undefined,
    showInformationMessage: jest.fn(),
    showTextDocument: jest.fn(),
  },
  workspace: {
    openTextDocument: jest.fn(),
    getConfiguration: jest.fn().mockReturnValue({
      get: jest.fn().mockImplementation((key: string, defaultValue: any) => {
        if (key === 'showLineNumbers') return true;
        if (key === 'maxBookmarksPerFile') return 100;
        return defaultValue;
      }),
    }),
  },
  Uri: {
    parse: jest.fn(),
  },
  Position: jest.fn().mockImplementation((line, character) => ({ line, character })),
  Selection: jest.fn().mockImplementation((start, end) => ({ start, end })),
  TextEditorRevealType: {
    InCenter: 'inCenter',
  },
}));

describe('GoToPreviousBookmarkCommand', () => {
  let command: GoToPreviousBookmarkCommand;
  let bookmarkManager: BookmarkManager;
  let collectionManager: CollectionManager;
  let mockEditor: any;
  let mockDocument: any;

  beforeEach(() => {
    collectionManager = new CollectionManager();
    bookmarkManager = new BookmarkManager(collectionManager);
    command = new GoToPreviousBookmarkCommand(bookmarkManager);

    // Mock editor and document
    mockDocument = {
      uri: {
        toString: () => 'file:///test.ts',
      },
    };

    mockEditor = {
      document: mockDocument,
      selection: {
        active: {
          line: 25,
        },
      },
      revealRange: jest.fn(),
    };

    (vscode.window.activeTextEditor as any) = mockEditor;
    (vscode.window.showTextDocument as any) = jest.fn().mockResolvedValue(mockEditor);
    (vscode.workspace.openTextDocument as any) = jest.fn().mockResolvedValue(mockDocument);
    (vscode.Uri.parse as any) = jest.fn().mockImplementation((uri) => uri);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should show message when no active editor and no bookmarks', async () => {
      (vscode.window.activeTextEditor as any) = null;

      await command.execute();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('No bookmarks found');
    });

    it('should show message when no bookmarks found', async () => {
      await command.execute();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('No bookmarks found');
    });

    it('should navigate to previous bookmark in same file', async () => {
      // Add bookmarks to the same file
      bookmarkManager.addBookmark('file:///test.ts', 10, 'ungrouped-bookmarks', 'Bookmark 1');
      bookmarkManager.addBookmark('file:///test.ts', 20, 'ungrouped-bookmarks', 'Bookmark 2');
      bookmarkManager.addBookmark('file:///test.ts', 30, 'ungrouped-bookmarks', 'Bookmark 3');

      await command.execute();
      await new Promise(setImmediate); // Wait for async

      expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith('file:///test.ts');
      expect(vscode.window.showTextDocument).toHaveBeenCalledWith(mockDocument);
      expect(vscode.Position).toHaveBeenCalledWith(19, 0);
      expect(mockEditor.revealRange).toHaveBeenCalled();
    });

    it('should navigate to previous bookmark in different file', async () => {
      // Add bookmarks to different files - current file has no bookmarks before line 25
      bookmarkManager.addBookmark('file:///other.ts', 1, 'ungrouped-bookmarks', 'Other file');
      bookmarkManager.addBookmark('file:///test.ts', 30, 'ungrouped-bookmarks', 'Current file');

      await command.execute();
      await new Promise(setImmediate); // Wait for async

      expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith('file:///other.ts');
      expect(vscode.window.showTextDocument).toHaveBeenCalled();
      expect(vscode.Position).toHaveBeenCalledWith(0, 0);
    });

    it('should wrap to last bookmark when no bookmark before current position', async () => {
      // Add bookmarks to different files
      bookmarkManager.addBookmark('file:///a.ts', 1, 'ungrouped-bookmarks', 'First file');
      bookmarkManager.addBookmark('file:///b.ts', 1, 'ungrouped-bookmarks', 'Second file');
      bookmarkManager.addBookmark('file:///c.ts', 1, 'ungrouped-bookmarks', 'Third file');

      await command.execute();
      await new Promise(setImmediate); // Wait for async

      // Should not show bookmark description message - visual navigation is sufficient
      expect(vscode.window.showInformationMessage).not.toHaveBeenCalledWith('Bookmark: Bookmark 3');
      expect(vscode.Position).toHaveBeenCalledWith(0, 0);
    });

    it('should navigate to bookmark without showing description message', async () => {
      bookmarkManager.addBookmark('file:///test.ts', 10, 'ungrouped-bookmarks', 'Test Description');

      await command.execute();
      await new Promise(setImmediate); // Wait for async

      // Should not show bookmark description message - visual navigation is sufficient
      expect(vscode.window.showInformationMessage).not.toHaveBeenCalledWith('Bookmark: Test Description');
    });
  });
}); 