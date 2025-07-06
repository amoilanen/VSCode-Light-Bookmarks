import * as vscode from 'vscode';
import { MoveBookmarkUpCommand } from '../../commands/MoveBookmarkUpCommand';
import { BookmarkManager } from '../../services/BookmarkManager';
import { CollectionManager } from '../../services/CollectionManager';
import { StorageService } from '../../services/StorageService';
import { BookmarkTreeDataProvider } from '../../providers/BookmarkTreeDataProvider';
import { BookmarkTreeItem } from '../../providers/BookmarkTreeDataProvider';
import { Bookmark } from '../../models/Bookmark';
import { Collection } from '../../models/Collection';

// Mock vscode
jest.mock('vscode');

describe('MoveBookmarkUpCommand', () => {
  let command: MoveBookmarkUpCommand;
  let bookmarkManager: jest.Mocked<BookmarkManager>;
  let collectionManager: jest.Mocked<CollectionManager>;
  let storageService: jest.Mocked<StorageService>;
  let treeDataProvider: jest.Mocked<BookmarkTreeDataProvider>;
  let mockBookmark: Bookmark;
  let mockTreeItem: BookmarkTreeItem;

  beforeEach(() => {
    bookmarkManager = {
      moveBookmarkUp: jest.fn(),
      getBookmark: jest.fn(),
      getAllBookmarks: jest.fn(),
    } as any;

    collectionManager = {
      getCollection: jest.fn(),
    } as any;

    storageService = {
      saveBookmarks: jest.fn(),
    } as any;

    treeDataProvider = {
      refreshCollection: jest.fn(),
      refreshRoot: jest.fn(),
    } as any;

    command = new MoveBookmarkUpCommand(
      bookmarkManager,
      storageService,
      treeDataProvider,
      collectionManager
    );

    mockBookmark = new Bookmark(
      'file:///test/file.ts',
      10,
      'test-collection',
      'Test bookmark'
    );
    mockTreeItem = new BookmarkTreeItem(
      'Test',
      vscode.TreeItemCollapsibleState.None,
      mockBookmark
    );
  });

  describe('execute', () => {
    it('should move bookmark up successfully', async () => {
      bookmarkManager.moveBookmarkUp.mockReturnValue(true);
      bookmarkManager.getBookmark.mockReturnValue(mockBookmark);
      const mockCollection = {
        id: 'test-collection',
        name: 'Test Collection',
        createdAt: new Date(),
        order: 0,
        toJSON: jest.fn(),
      } as Collection;
      collectionManager.getCollection.mockReturnValue(mockCollection);
      storageService.saveBookmarks.mockResolvedValue();

      await command.execute(mockTreeItem);

      expect(bookmarkManager.moveBookmarkUp).toHaveBeenCalledWith(
        'file:///test/file.ts',
        10
      );
      expect(storageService.saveBookmarks).toHaveBeenCalled();
      expect(treeDataProvider.refreshRoot).toHaveBeenCalled();
    });

    it('should show error message when bookmark cannot be moved up', async () => {
      bookmarkManager.moveBookmarkUp.mockReturnValue(false);
      const showInformationMessageSpy = jest.spyOn(
        vscode.window,
        'showInformationMessage'
      );

      await command.execute(mockTreeItem);

      expect(showInformationMessageSpy).toHaveBeenCalledWith(
        'Bookmark is already at the top or cannot be moved'
      );
      expect(storageService.saveBookmarks).not.toHaveBeenCalled();
      expect(treeDataProvider.refreshCollection).not.toHaveBeenCalled();
    });

    it('should show error message when no bookmark is selected', async () => {
      const showInformationMessageSpy = jest.spyOn(
        vscode.window,
        'showInformationMessage'
      );

      await command.execute();

      expect(showInformationMessageSpy).toHaveBeenCalledWith(
        'No bookmark selected'
      );
      expect(bookmarkManager.moveBookmarkUp).not.toHaveBeenCalled();
    });

    it('should show error message when tree item has no bookmark', async () => {
      const treeItemWithoutBookmark = new BookmarkTreeItem(
        'Test',
        vscode.TreeItemCollapsibleState.None
      );
      const showInformationMessageSpy = jest.spyOn(
        vscode.window,
        'showInformationMessage'
      );

      await command.execute(treeItemWithoutBookmark);

      expect(showInformationMessageSpy).toHaveBeenCalledWith(
        'No bookmark selected'
      );
      expect(bookmarkManager.moveBookmarkUp).not.toHaveBeenCalled();
    });
  });
});
