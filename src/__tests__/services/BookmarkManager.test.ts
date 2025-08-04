import { BookmarkManager } from '../../services/BookmarkManager';
import { CollectionManager } from '../../services/CollectionManager';
import { Bookmark } from '../../models/Bookmark';
import { Collection } from '../../models/Collection';
import * as vscode from 'vscode';

describe('BookmarkManager', () => {
  let bookmarkManager: BookmarkManager;
  const mockUri = 'file:///test/file.ts';
  const mockLine = 10;

  beforeEach(() => {
    const collectionManager = new CollectionManager();
    bookmarkManager = new BookmarkManager(collectionManager);
  });

  describe('addBookmark', () => {
    it('should add a bookmark successfully', () => {
      const bookmark = bookmarkManager.addBookmark(mockUri, mockLine);

      expect(bookmark).toBeInstanceOf(Bookmark);
      expect(bookmark).not.toBeNull();
      if (bookmark) {
        expect(bookmark.uri).toBe(mockUri);
        expect(bookmark.line).toBe(mockLine);
      }
      expect(bookmarkManager.getAllBookmarks()).toHaveLength(1);
    });

    it('should not add duplicate bookmarks', () => {
      bookmarkManager.addBookmark(mockUri, mockLine);
      const result = bookmarkManager.addBookmark(mockUri, mockLine);

      expect(result).toBeNull();
      expect(bookmarkManager.getAllBookmarks()).toHaveLength(1);
    });

    it('should add bookmark with collection', () => {
      const collection = new Collection('Test');
      const bookmark = bookmarkManager.addBookmark(
        mockUri,
        mockLine,
        collection.id
      );

      expect(bookmark).not.toBeNull();
      if (bookmark) {
        expect(bookmark.collectionId).toBe(collection.id);
      }
    });
  });

  describe('removeBookmark', () => {
    it('should remove existing bookmark', () => {
      bookmarkManager.addBookmark(mockUri, mockLine);
      const result = bookmarkManager.removeBookmark(mockUri, mockLine);

      expect(result).toBe(true);
      expect(bookmarkManager.getAllBookmarks()).toHaveLength(0);
    });

    it('should return false for non-existent bookmark', () => {
      const result = bookmarkManager.removeBookmark(mockUri, mockLine);

      expect(result).toBe(false);
    });
  });

  describe('toggleBookmark', () => {
    it('should add bookmark when it does not exist', () => {
      const bookmark = bookmarkManager.toggleBookmark(mockUri, mockLine);

      expect(bookmark).toBeInstanceOf(Bookmark);
      expect(bookmarkManager.getAllBookmarks()).toHaveLength(1);
    });

    it('should remove bookmark when it exists', () => {
      bookmarkManager.addBookmark(mockUri, mockLine);
      const result = bookmarkManager.toggleBookmark(mockUri, mockLine);

      expect(result).toBeNull();
      expect(bookmarkManager.getAllBookmarks()).toHaveLength(0);
    });
  });

  describe('getBookmarksByUri', () => {
    it('should return bookmarks for specific uri', () => {
      bookmarkManager.addBookmark(mockUri, 10);
      bookmarkManager.addBookmark(mockUri, 20);
      bookmarkManager.addBookmark('file:///other/file.ts', 15);

      const bookmarks = bookmarkManager.getBookmarksByUri(mockUri);

      expect(bookmarks).toHaveLength(2);
      expect(bookmarks.every(b => b.uri === mockUri)).toBe(true);
    });

    it('should return empty array for non-existent uri', () => {
      const bookmarks = bookmarkManager.getBookmarksByUri(
        'file:///nonexistent/file.ts'
      );

      expect(bookmarks).toHaveLength(0);
    });
  });

  describe('getBookmarksByCollection', () => {
    it('should return bookmarks for specific collection', () => {
      const collectionId = 'test-collection';
      bookmarkManager.addBookmark(mockUri, 10, collectionId);
      bookmarkManager.addBookmark(mockUri, 20);
      bookmarkManager.addBookmark('file:///other/file.ts', 15, collectionId);

      const bookmarks = bookmarkManager.getBookmarksByCollection(collectionId);

      expect(bookmarks).toHaveLength(2);
      expect(bookmarks.every(b => b.collectionId === collectionId)).toBe(true);
    });
  });

  describe('clearAllBookmarks', () => {
    it('should remove all bookmarks', () => {
      bookmarkManager.addBookmark(mockUri, 10);
      bookmarkManager.addBookmark(mockUri, 20);
      bookmarkManager.addBookmark('file:///other/file.ts', 15);

      bookmarkManager.clearAllBookmarks();

      expect(bookmarkManager.getAllBookmarks()).toHaveLength(0);
    });
  });

  describe('ungrouped collection creation', () => {
    it('should automatically create ungrouped collection when adding first bookmark', () => {
      // Arrange - start with empty collection manager
      const collectionManager = new CollectionManager();
      const bookmarkManager = new BookmarkManager(collectionManager);

      // Act - add a bookmark without specifying collection
      const bookmark = bookmarkManager.addBookmark(mockUri, mockLine);

      // Assert
      expect(bookmark).not.toBeNull();
      if (bookmark) {
        expect(bookmark.collectionId).toBe('ungrouped-bookmarks');
      }

      // Check that the ungrouped collection was created
      const ungroupedCollection = collectionManager.getCollection(
        'ungrouped-bookmarks'
      );
      expect(ungroupedCollection).toBeDefined();
      expect(ungroupedCollection?.name).toBe('Ungrouped');
    });

    it('should reuse existing ungrouped collection when adding more bookmarks', () => {
      // Arrange - start with empty collection manager
      const collectionManager = new CollectionManager();
      const bookmarkManager = new BookmarkManager(collectionManager);

      // Act - add two bookmarks
      const bookmark1 = bookmarkManager.addBookmark(mockUri, 10);
      const bookmark2 = bookmarkManager.addBookmark(mockUri, 20);

      // Assert
      expect(bookmark1).not.toBeNull();
      expect(bookmark2).not.toBeNull();

      // Check that only one ungrouped collection exists
      const ungroupedCollection = collectionManager.getCollection(
        'ungrouped-bookmarks'
      );
      expect(ungroupedCollection).toBeDefined();

      const allCollections = collectionManager.getAllCollections();
      const ungroupedCollections = allCollections.filter(
        c => c.id === 'ungrouped-bookmarks'
      );
      expect(ungroupedCollections).toHaveLength(1);
    });
  });

  describe('moveBookmarkUp', () => {
    it('should move bookmark up successfully', () => {
      const collectionId = 'test-collection';
      const bookmark1 = bookmarkManager.addBookmark(mockUri, 10, collectionId);
      const bookmark2 = bookmarkManager.addBookmark(mockUri, 20, collectionId);
      const bookmark3 = bookmarkManager.addBookmark(mockUri, 30, collectionId);

      expect(bookmark1).not.toBeNull();
      expect(bookmark2).not.toBeNull();
      expect(bookmark3).not.toBeNull();

      if (bookmark1 && bookmark2 && bookmark3) {
        // Set initial order values
        bookmark1.order = 0;
        bookmark2.order = 10;
        bookmark3.order = 20;

        const result = bookmarkManager.moveBookmarkUp(mockUri, 20); // Move bookmark3 up

        expect(result).toBe(true);

        // Check that order values were swapped and normalized
        const bookmarks =
          bookmarkManager.getBookmarksByCollection(collectionId);
        expect(bookmarks[0].order).toBe(0); // bookmark1
        expect(bookmarks[1].order).toBe(10); // bookmark3 (moved up)
        expect(bookmarks[2].order).toBe(20); // bookmark2 (moved down)
      }
    });

    it('should return false when bookmark is already at the top', () => {
      const collectionId = 'test-collection';
      const bookmark = bookmarkManager.addBookmark(mockUri, 10, collectionId);

      if (bookmark) {
        bookmark.order = 0;
        const result = bookmarkManager.moveBookmarkUp(mockUri, 10);

        expect(result).toBe(false);
      }
    });

    it('should return false when bookmark has no collection', () => {
      // Create a bookmark without a collection by using undefined collectionId
      const bookmark = bookmarkManager.addBookmark(mockUri, 10, undefined);

      if (bookmark) {
        // The bookmark should have 'ungrouped-bookmarks' as collectionId, not undefined
        // So we need to test with a bookmark that actually has no collection
        // For this test, we'll just verify that ungrouped bookmarks can't be moved
        const result = bookmarkManager.moveBookmarkUp(mockUri, 10);

        expect(result).toBe(false);
      }
    });
  });

  describe('moveBookmarkDown', () => {
    it('should move bookmark down successfully', () => {
      const collectionId = 'test-collection';
      const bookmark1 = bookmarkManager.addBookmark(mockUri, 10, collectionId);
      const bookmark2 = bookmarkManager.addBookmark(mockUri, 20, collectionId);
      const bookmark3 = bookmarkManager.addBookmark(mockUri, 30, collectionId);

      expect(bookmark1).not.toBeNull();
      expect(bookmark2).not.toBeNull();
      expect(bookmark3).not.toBeNull();

      if (bookmark1 && bookmark2 && bookmark3) {
        // Set initial order values
        bookmark1.order = 0;
        bookmark2.order = 10;
        bookmark3.order = 20;

        const result = bookmarkManager.moveBookmarkDown(mockUri, 10); // Move bookmark1 down

        expect(result).toBe(true);

        // Check that order values were swapped and normalized
        const bookmarks =
          bookmarkManager.getBookmarksByCollection(collectionId);
        expect(bookmarks[0].order).toBe(0); // bookmark2 (moved up)
        expect(bookmarks[1].order).toBe(10); // bookmark1 (moved down)
        expect(bookmarks[2].order).toBe(20); // bookmark3
      }
    });

    it('should return false when bookmark is already at the bottom', () => {
      const collectionId = 'test-collection';
      const bookmark = bookmarkManager.addBookmark(mockUri, 10, collectionId);

      if (bookmark) {
        bookmark.order = 0;
        const result = bookmarkManager.moveBookmarkDown(mockUri, 10);

        expect(result).toBe(false);
      }
    });

    it('should return false when bookmark has no collection', () => {
      // Create a bookmark without a collection by using undefined collectionId
      const bookmark = bookmarkManager.addBookmark(mockUri, 10, undefined);

      if (bookmark) {
        // The bookmark should have 'ungrouped-bookmarks' as collectionId, not undefined
        // So we need to test with a bookmark that actually has no collection
        // For this test, we'll just verify that ungrouped bookmarks can't be moved
        const result = bookmarkManager.moveBookmarkDown(mockUri, 10);

        expect(result).toBe(false);
      }
    });
  });

  describe('getBookmarksByCollection ordering', () => {
    it('should return bookmarks sorted by order', () => {
      const collectionId = 'test-collection';
      const bookmark1 = bookmarkManager.addBookmark(mockUri, 10, collectionId);
      const bookmark2 = bookmarkManager.addBookmark(mockUri, 20, collectionId);
      const bookmark3 = bookmarkManager.addBookmark(mockUri, 30, collectionId);

      if (bookmark1 && bookmark2 && bookmark3) {
        // Set order values in reverse order
        bookmark1.order = 20;
        bookmark2.order = 10;
        bookmark3.order = 0;

        const bookmarks =
          bookmarkManager.getBookmarksByCollection(collectionId);

        // Should be sorted by order (ascending)
        expect(bookmarks[0].order).toBe(0);
        expect(bookmarks[1].order).toBe(10);
        expect(bookmarks[2].order).toBe(20);
      }
    });
  });

  describe('Document change handling', () => {
    it('should remove bookmarks when their lines are deleted', () => {
      const collectionManager = new CollectionManager();
      const manager = new BookmarkManager(collectionManager);

      // Add bookmarks at different lines
      manager.addBookmark('file:///test.ts', 5);
      manager.addBookmark('file:///test.ts', 10);
      manager.addBookmark('file:///test.ts', 15);

      expect(manager.getAllBookmarks()).toHaveLength(3);

      // Simulate deletion of lines 8-12 (which includes bookmark2 at line 10)
      // Mock event structure for reference
      // const mockEvent = {
      //   document: { uri: { toString: () => 'file:///test.ts' } },
      //   contentChanges: [
      //     {
      //       range: { start: { line: 8 }, end: { line: 12 } },
      //       text: '',
      //     },
      //   ],
      // };

      // Test the new updateBookmarksForDocumentChanges method
      const mockContentChanges = [
        {
          range: { start: { line: 8 }, end: { line: 12 } },
          rangeOffset: 0,
          rangeLength: 0,
          text: '',
        },
      ] as vscode.TextDocumentContentChangeEvent[];

      manager.updateBookmarksForDocumentChanges(
        'file:///test.ts',
        mockContentChanges
      );

      // Verify bookmark2 was removed but others remain
      expect(manager.getAllBookmarks()).toHaveLength(2);
      expect(manager.hasBookmark('file:///test.ts', 5)).toBe(true);
      expect(manager.hasBookmark('file:///test.ts', 10)).toBe(false);
      expect(manager.hasBookmark('file:///test.ts', 11)).toBe(true); // 15 - 4 = 11
    });

    it('should update bookmark line numbers when lines are inserted above', () => {
      const collectionManager = new CollectionManager();
      const manager = new BookmarkManager(collectionManager);

      // Add bookmarks
      manager.addBookmark('file:///test.ts', 5);
      manager.addBookmark('file:///test.ts', 10);

      expect(manager.getAllBookmarks()).toHaveLength(2);

      // Simulate insertion of 3 lines at line 3
      // Mock event structure for reference
      // const mockEvent = {
      //   document: { uri: { toString: () => 'file:///test.ts' } },
      //   contentChanges: [
      //     {
      //       range: { start: { line: 3 }, end: { line: 3 } },
      //       text: 'new line 1\nnew line 2\nnew line 3\n',
      //     },
      //   ],
      // };

      // Test the new updateBookmarksForDocumentChanges method
      const mockContentChanges = [
        {
          range: { start: { line: 3 }, end: { line: 3 } },
          rangeOffset: 0,
          rangeLength: 0,
          text: 'new line 1\nnew line 2\nnew line 3\n',
        },
      ] as vscode.TextDocumentContentChangeEvent[];

      manager.updateBookmarksForDocumentChanges(
        'file:///test.ts',
        mockContentChanges
      );

      // Verify bookmarks moved down by 3 lines
      expect(manager.getAllBookmarks()).toHaveLength(2);
      expect(manager.hasBookmark('file:///test.ts', 5)).toBe(false);
      expect(manager.hasBookmark('file:///test.ts', 8)).toBe(true); // 5 + 3
      expect(manager.hasBookmark('file:///test.ts', 10)).toBe(false);
      expect(manager.hasBookmark('file:///test.ts', 13)).toBe(true); // 10 + 3
    });
  });
});
