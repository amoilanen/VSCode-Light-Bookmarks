import { DeleteCollectionCommand } from '../../commands/DeleteCollectionCommand';
import { CollectionManager } from '../../services/CollectionManager';
import { BookmarkManager } from '../../services/BookmarkManager';
import { StorageService } from '../../services/StorageService';
import { BookmarkTreeDataProvider } from '../../providers/BookmarkTreeDataProvider';
import { BookmarkDecorationProvider } from '../../providers/BookmarkDecorationProvider';
import { Collection } from '../../models/Collection';
import * as vscode from 'vscode';

describe('DeleteCollectionCommand', () => {
  let command: DeleteCollectionCommand;
  let collectionManager: CollectionManager;
  let bookmarkManager: BookmarkManager;
  let storageService: StorageService;
  let treeDataProvider: BookmarkTreeDataProvider;
  let decorationProvider: BookmarkDecorationProvider;

  beforeEach(() => {
    collectionManager = new CollectionManager();
    bookmarkManager = new BookmarkManager(collectionManager);
    storageService = {
      saveBookmarks: jest.fn().mockResolvedValue(undefined),
      saveCollections: jest.fn().mockResolvedValue(undefined),
    } as unknown as StorageService;
    treeDataProvider = {
      refresh: jest.fn(),
      refreshRoot: jest.fn(),
      refreshCollection: jest.fn(),
      refreshUngrouped: jest.fn(),
      markCollectionExpanded: jest.fn(),
      markCollectionCollapsed: jest.fn(),
      markBookmarkExpanded: jest.fn(),
      markBookmarkCollapsed: jest.fn(),
      getExpandedCollections: jest.fn(),
      getExpandedBookmarks: jest.fn(),
      isCollectionExpanded: jest.fn(),
      isBookmarkExpanded: jest.fn(),
    } as unknown as BookmarkTreeDataProvider;
    decorationProvider = {
      updateDecorations: jest.fn(),
    } as unknown as BookmarkDecorationProvider;

    command = new DeleteCollectionCommand(
      collectionManager,
      bookmarkManager,
      storageService,
      treeDataProvider,
      decorationProvider
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should delete empty "Ungrouped" collection immediately', async () => {
      // Arrange - create the ungrouped collection
      const ungrouped = new Collection('Ungrouped', 'workspace', 0);
      Object.defineProperty(ungrouped, 'id', {
        value: 'ungrouped-bookmarks',
        writable: false,
      });
      collectionManager.addCollection(ungrouped);

      // Act
      await command.execute('ungrouped-bookmarks');

      // Assert - ungrouped collection should be deleted immediately when empty
      expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
      expect(
        collectionManager.getCollection('ungrouped-bookmarks')
      ).toBeUndefined();
      expect(storageService.saveCollections).toHaveBeenCalled();
      expect(treeDataProvider.refreshRoot).toHaveBeenCalled();
      expect(decorationProvider.updateDecorations).toHaveBeenCalled();
    });

    it('should delete an empty collection immediately without confirmation', async () => {
      // Arrange
      const collection = collectionManager.createCollection('Test Collection');
      expect(collection).not.toBeNull();
      if (!collection) return;

      // Act
      await command.execute(collection.id);

      // Assert
      expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
      expect(collectionManager.getCollection(collection.id)).toBeUndefined();
      expect(storageService.saveCollections).toHaveBeenCalled();
      expect(treeDataProvider.refreshRoot).toHaveBeenCalled();
      expect(decorationProvider.updateDecorations).toHaveBeenCalled();
    });

    it('should show error when collection not found', async () => {
      // Act
      await command.execute('non-existent-id');

      // Assert
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Collection not found'
      );
    });

    it('should handle collection with bookmarks - user confirms deletion', async () => {
      // Arrange
      const collection = collectionManager.createCollection('Test Collection');
      expect(collection).not.toBeNull();
      if (!collection) return;

      bookmarkManager.addBookmark('file:///test.ts', 10, collection.id);

      // Mock user confirmation
      (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue(
        'Delete'
      );

      // Act
      await command.execute(collection.id);

      // Assert
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'Deleting the collection will also delete all bookmarks it contains. Continue?',
        { modal: true },
        'Delete'
      );
      expect(collectionManager.getCollection(collection.id)).toBeUndefined();
      expect(
        bookmarkManager.getBookmark('file:///test.ts', 10)
      ).toBeUndefined();
      expect(storageService.saveBookmarks).toHaveBeenCalled();
      expect(storageService.saveCollections).toHaveBeenCalled();
      expect(treeDataProvider.refreshRoot).toHaveBeenCalled();
      expect(decorationProvider.updateDecorations).toHaveBeenCalled();
    });

    it('should cancel deletion when user cancels', async () => {
      // Arrange
      const collection = collectionManager.createCollection('Test Collection');
      expect(collection).not.toBeNull();
      if (!collection) return;

      bookmarkManager.addBookmark('file:///test.ts', 10, collection.id);

      // Mock user cancellation
      (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue(
        'Cancel'
      );

      // Act
      await command.execute(collection.id);

      // Assert
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'Deleting the collection will also delete all bookmarks it contains. Continue?',
        { modal: true },
        'Delete'
      );
      expect(collectionManager.getCollection(collection.id)).toBeDefined();
      expect(bookmarkManager.getBookmark('file:///test.ts', 10)).toBeDefined();
      expect(storageService.saveCollections).not.toHaveBeenCalled();
      expect(treeDataProvider.refreshRoot).not.toHaveBeenCalled();
      expect(decorationProvider.updateDecorations).not.toHaveBeenCalled();
    });
  });
});
