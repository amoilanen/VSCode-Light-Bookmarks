import { BookmarkManager } from '../../services/BookmarkManager';
import { CollectionManager } from '../../services/CollectionManager';
import { Bookmark } from '../../models/Bookmark';
import { Collection } from '../../models/Collection';

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
      const bookmark = bookmarkManager.addBookmark(mockUri, mockLine, collection.id);

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
      const bookmarks = bookmarkManager.getBookmarksByUri('file:///nonexistent/file.ts');

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
      const ungroupedCollection = collectionManager.getCollection('ungrouped-bookmarks');
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
      const ungroupedCollection = collectionManager.getCollection('ungrouped-bookmarks');
      expect(ungroupedCollection).toBeDefined();
      
      const allCollections = collectionManager.getAllCollections();
      const ungroupedCollections = allCollections.filter(c => c.id === 'ungrouped-bookmarks');
      expect(ungroupedCollections).toHaveLength(1);
    });
  });
}); 