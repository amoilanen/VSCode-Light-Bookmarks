import { CollectionManager } from '../../services/CollectionManager';
import { Collection } from '../../models/Collection';

describe('CollectionManager', () => {
  let collectionManager: CollectionManager;

  beforeEach(() => {
    collectionManager = new CollectionManager();
  });

  describe('createCollection', () => {
    it('should create a new collection', () => {
      const collection = collectionManager.createCollection('Test Collection');

      expect(collection).not.toBeNull();
      expect(collection?.name).toBe('Test Collection');
      expect(collection?.workspaceId).toBeUndefined();
      expect(collection?.order).toBe(0);
    });

    it('should create a collection with workspace ID', () => {
      const workspaceId = 'file:///test/workspace';
      const collection = collectionManager.createCollection('Test Collection', workspaceId);

      expect(collection).not.toBeNull();
      expect(collection?.name).toBe('Test Collection');
      expect(collection?.workspaceId).toBe(workspaceId);
      expect(collection?.order).toBe(0);
    });

    it('should create collections with incremental order numbers', () => {
      const workspaceId = 'file:///test/workspace';
      const collection1 = collectionManager.createCollection('Collection 1', workspaceId);
      const collection2 = collectionManager.createCollection('Collection 2', workspaceId);
      const collection3 = collectionManager.createCollection('Collection 3', workspaceId);

      expect(collection1?.order).toBe(0);
      expect(collection2?.order).toBe(10);
      expect(collection3?.order).toBe(20);
    });

    it('should return null if collection with same name already exists in the same workspace', () => {
      const workspaceId = 'file:///test/workspace';
      collectionManager.createCollection('Test Collection', workspaceId);
      const duplicate = collectionManager.createCollection('Test Collection', workspaceId);

      expect(duplicate).toBeNull();
    });

    it('should allow collections with same name in different workspaces', () => {
      const workspace1 = 'file:///workspace1';
      const workspace2 = 'file:///workspace2';
      
      const collection1 = collectionManager.createCollection('Test Collection', workspace1);
      const collection2 = collectionManager.createCollection('Test Collection', workspace2);

      expect(collection1).not.toBeNull();
      expect(collection2).not.toBeNull();
      expect(collection1?.workspaceId).toBe(workspace1);
      expect(collection2?.workspaceId).toBe(workspace2);
    });
  });

  describe('deleteCollection', () => {
    it('should delete collection by id', () => {
      const collection = collectionManager.createCollection('Test Collection');
      expect(collection).not.toBeNull();
      if (!collection) return;

      const deleted = collectionManager.deleteCollection(collection.id);

      expect(deleted).toBe(true);
      expect(collectionManager.getCollection(collection.id)).toBeUndefined();
    });

    it('should return false for non-existent collection', () => {
      const deleted = collectionManager.deleteCollection('non-existent-id');

      expect(deleted).toBe(false);
    });
  });

  describe('getCollection', () => {
    it('should return collection by id', () => {
      const collection = collectionManager.createCollection('Test Collection');
      expect(collection).not.toBeNull();
      if (!collection) return;
      
      const found = collectionManager.getCollection(collection.id);

      expect(found).toBe(collection);
    });

    it('should return undefined for non-existent collection', () => {
      const found = collectionManager.getCollection('non-existent-id');

      expect(found).toBeUndefined();
    });
  });

  describe('getCollectionByName', () => {
    it('should return collection by name', () => {
      const collection = collectionManager.createCollection('Test Collection');
      expect(collection).not.toBeNull();
      if (!collection) return;
      
      const found = collectionManager.getCollectionByName('Test Collection');

      expect(found).toBe(collection);
    });

    it('should return undefined for non-existent collection name', () => {
      const found = collectionManager.getCollectionByName('Non-existent Collection');

      expect(found).toBeUndefined();
    });
  });

  describe('getAllCollections', () => {
    it('should return all collections', () => {
      const collection1 = collectionManager.createCollection('Collection 1');
      const collection2 = collectionManager.createCollection('Collection 2');
      expect(collection1).not.toBeNull();
      expect(collection2).not.toBeNull();
      if (!collection1 || !collection2) return;

      const allCollections = collectionManager.getAllCollections();

      expect(allCollections).toHaveLength(2);
      expect(allCollections).toContain(collection1);
      expect(allCollections).toContain(collection2);
    });

    it('should return empty array when no collections exist', () => {
      const allCollections = collectionManager.getAllCollections();

      expect(allCollections).toHaveLength(0);
    });
  });

  describe('getCollectionsForWorkspace', () => {
    it('should return collections for specific workspace in order', () => {
      const workspace1 = 'file:///workspace1';
      const workspace2 = 'file:///workspace2';
      
      const collection1 = collectionManager.createCollection('Collection 1', workspace1);
      const collection2 = collectionManager.createCollection('Collection 2', workspace1);
      const collection3 = collectionManager.createCollection('Collection 3', workspace2);
      expect(collection1).not.toBeNull();
      expect(collection2).not.toBeNull();
      expect(collection3).not.toBeNull();
      if (!collection1 || !collection2 || !collection3) return;

      const workspace1Collections = collectionManager.getCollectionsForWorkspace(workspace1);
      const workspace2Collections = collectionManager.getCollectionsForWorkspace(workspace2);

      expect(workspace1Collections).toHaveLength(2);
      expect(workspace1Collections[0]).toBe(collection1);
      expect(workspace1Collections[1]).toBe(collection2);
      
      expect(workspace2Collections).toHaveLength(1);
      expect(workspace2Collections[0]).toBe(collection3);
    });

    it('should return collections without workspace ID when workspaceId is undefined', () => {
      const collection1 = collectionManager.createCollection('Collection 1'); // no workspace
      const collection2 = collectionManager.createCollection('Collection 2', 'file:///workspace1');
      expect(collection1).not.toBeNull();
      expect(collection2).not.toBeNull();
      if (!collection1 || !collection2) return;

      const noWorkspaceCollections = collectionManager.getCollectionsForWorkspace(undefined);

      expect(noWorkspaceCollections).toHaveLength(1);
      expect(noWorkspaceCollections).toContain(collection1);
    });

    it('should return empty array when no collections exist for workspace', () => {
      const collections = collectionManager.getCollectionsForWorkspace('file:///nonexistent');

      expect(collections).toHaveLength(0);
    });
  });

  describe('addCollection', () => {
    it('should add a collection directly', () => {
      const collection = new Collection('Test Collection', 'file:///workspace1');

      collectionManager.addCollection(collection);

      expect(collectionManager.getAllCollections()).toHaveLength(1);
      expect(collectionManager.getCollection(collection.id)).toBe(collection);
    });
  });

  describe('clearAllCollections', () => {
    it('should remove all collections', () => {
      collectionManager.createCollection('Collection 1');
      collectionManager.createCollection('Collection 2');

      collectionManager.clearAllCollections();

      expect(collectionManager.getAllCollections()).toHaveLength(0);
    });
  });

  describe('hasCollection', () => {
    it('should return true for existing collection', () => {
      const collection = collectionManager.createCollection('Test Collection');
      expect(collection).not.toBeNull();
      if (!collection) return;

      const hasCollection = collectionManager.hasCollection(collection.id);

      expect(hasCollection).toBe(true);
    });

    it('should return false for non-existent collection', () => {
      const hasCollection = collectionManager.hasCollection('non-existent-id');

      expect(hasCollection).toBe(false);
    });
  });

  describe('hasCollectionForWorkspace', () => {
    it('should return true for existing collection in specific workspace', () => {
      const workspaceId = 'file:///workspace1';
      const collection = collectionManager.createCollection('Test Collection', workspaceId);
      expect(collection).not.toBeNull();
      if (!collection) return;

      const hasCollection = collectionManager.hasCollectionForWorkspace(collection.id, workspaceId);

      expect(hasCollection).toBe(true);
    });

    it('should return false for collection in different workspace', () => {
      const workspace1 = 'file:///workspace1';
      const workspace2 = 'file:///workspace2';
      const collection = collectionManager.createCollection('Test Collection', workspace1);
      expect(collection).not.toBeNull();
      if (!collection) return;

      const hasCollection = collectionManager.hasCollectionForWorkspace(collection.id, workspace2);

      expect(hasCollection).toBe(false);
    });

    it('should return false for non-existent collection', () => {
      const hasCollection = collectionManager.hasCollectionForWorkspace('non-existent-id', 'file:///workspace1');

      expect(hasCollection).toBe(false);
    });
  });

  describe('hasCollectionByName', () => {
    it('should return true for existing collection name', () => {
      collectionManager.createCollection('Test Collection');

      const hasCollection = collectionManager.hasCollectionByName('Test Collection');

      expect(hasCollection).toBe(true);
    });

    it('should return false for non-existent collection name', () => {
      const hasCollection = collectionManager.hasCollectionByName('Non-existent Collection');

      expect(hasCollection).toBe(false);
    });
  });

  describe('ensureUngroupedCollection', () => {
    it('should create ungrouped collection for workspace if it does not exist', () => {
      const workspaceId = 'file:///workspace1';
      
      const ungrouped = collectionManager.ensureUngroupedCollection(workspaceId);

      expect(ungrouped).toBeDefined();
      expect(ungrouped.id).toBe('ungrouped-bookmarks');
      expect(ungrouped.name).toBe('Ungrouped');
      expect(ungrouped.workspaceId).toBe(workspaceId);
      expect(collectionManager.hasCollectionForWorkspace('ungrouped-bookmarks', workspaceId)).toBe(true);
    });

    it('should return existing ungrouped collection for workspace if it already exists', () => {
      const workspaceId = 'file:///workspace1';
      
      // Create first ungrouped collection
      const ungrouped1 = collectionManager.ensureUngroupedCollection(workspaceId);
      
      // Try to create another one
      const ungrouped2 = collectionManager.ensureUngroupedCollection(workspaceId);

      expect(ungrouped1).toBe(ungrouped2);
      expect(collectionManager.getAllCollections().filter(c => c.id === 'ungrouped-bookmarks')).toHaveLength(1);
    });

    it('should create separate ungrouped collections for different workspaces', () => {
      const workspace1 = 'file:///workspace1';
      const workspace2 = 'file:///workspace2';
      
      const ungrouped1 = collectionManager.ensureUngroupedCollection(workspace1);
      const ungrouped2 = collectionManager.ensureUngroupedCollection(workspace2);

      expect(ungrouped1).not.toBe(ungrouped2);
      expect(ungrouped1.workspaceId).toBe(workspace1);
      expect(ungrouped2.workspaceId).toBe(workspace2);
      expect(collectionManager.getAllCollections().filter(c => c.id === 'ungrouped-bookmarks')).toHaveLength(2);
    });
  });

  describe('moveCollectionUp', () => {
    it('should move collection up in order', () => {
      const workspaceId = 'file:///workspace1';
      const collection1 = collectionManager.createCollection('Collection 1', workspaceId);
      const collection2 = collectionManager.createCollection('Collection 2', workspaceId);
      const collection3 = collectionManager.createCollection('Collection 3', workspaceId);
      expect(collection1).not.toBeNull();
      expect(collection2).not.toBeNull();
      expect(collection3).not.toBeNull();
      if (!collection1 || !collection2 || !collection3) return;

      // Move collection3 up
      const success = collectionManager.moveCollectionUp(collection3.id);

      expect(success).toBe(true);
      
      const collections = collectionManager.getCollectionsForWorkspace(workspaceId);
      expect(collections[0]).toBe(collection1);
      expect(collections[1]).toBe(collection3);
      expect(collections[2]).toBe(collection2);
    });

    it('should return false when collection is already at the top', () => {
      const workspaceId = 'file:///workspace1';
      const collection1 = collectionManager.createCollection('Collection 1', workspaceId);
      const collection2 = collectionManager.createCollection('Collection 2', workspaceId);
      expect(collection1).not.toBeNull();
      expect(collection2).not.toBeNull();
      if (!collection1 || !collection2) return;

      const success = collectionManager.moveCollectionUp(collection1.id);

      expect(success).toBe(false);
    });

    it('should return false for non-existent collection', () => {
      const success = collectionManager.moveCollectionUp('non-existent-id');

      expect(success).toBe(false);
    });
  });

  describe('moveCollectionDown', () => {
    it('should move collection down in order', () => {
      const workspaceId = 'file:///workspace1';
      const collection1 = collectionManager.createCollection('Collection 1', workspaceId);
      const collection2 = collectionManager.createCollection('Collection 2', workspaceId);
      const collection3 = collectionManager.createCollection('Collection 3', workspaceId);
      expect(collection1).not.toBeNull();
      expect(collection2).not.toBeNull();
      expect(collection3).not.toBeNull();
      if (!collection1 || !collection2 || !collection3) return;

      // Move collection1 down
      const success = collectionManager.moveCollectionDown(collection1.id);

      expect(success).toBe(true);
      
      const collections = collectionManager.getCollectionsForWorkspace(workspaceId);
      expect(collections[0]).toBe(collection2);
      expect(collections[1]).toBe(collection1);
      expect(collections[2]).toBe(collection3);
    });

    it('should return false when collection is already at the bottom', () => {
      const workspaceId = 'file:///workspace1';
      const collection1 = collectionManager.createCollection('Collection 1', workspaceId);
      const collection2 = collectionManager.createCollection('Collection 2', workspaceId);
      expect(collection1).not.toBeNull();
      expect(collection2).not.toBeNull();
      if (!collection1 || !collection2) return;

      const success = collectionManager.moveCollectionDown(collection2.id);

      expect(success).toBe(false);
    });

    it('should return false for non-existent collection', () => {
      const success = collectionManager.moveCollectionDown('non-existent-id');

      expect(success).toBe(false);
    });
  });

  describe('moveCollectionToPosition', () => {
    it('should move collection to specific position', () => {
      const workspaceId = 'file:///workspace1';
      const collection1 = collectionManager.createCollection('Collection 1', workspaceId);
      const collection2 = collectionManager.createCollection('Collection 2', workspaceId);
      const collection3 = collectionManager.createCollection('Collection 3', workspaceId);
      expect(collection1).not.toBeNull();
      expect(collection2).not.toBeNull();
      expect(collection3).not.toBeNull();
      if (!collection1 || !collection2 || !collection3) return;

      // Move collection3 to position 0
      const success = collectionManager.moveCollectionToPosition(collection3.id, 0);

      expect(success).toBe(true);
      
      const collections = collectionManager.getCollectionsForWorkspace(workspaceId);
      expect(collections[0]).toBe(collection3);
      expect(collections[1]).toBe(collection1);
      expect(collections[2]).toBe(collection2);
    });

    it('should return false for invalid position', () => {
      const workspaceId = 'file:///workspace1';
      const collection1 = collectionManager.createCollection('Collection 1', workspaceId);
      expect(collection1).not.toBeNull();
      if (!collection1) return;

      const success = collectionManager.moveCollectionToPosition(collection1.id, 5);

      expect(success).toBe(false);
    });

    it('should return true when moving to same position', () => {
      const workspaceId = 'file:///workspace1';
      const collection1 = collectionManager.createCollection('Collection 1', workspaceId);
      expect(collection1).not.toBeNull();
      if (!collection1) return;

      const success = collectionManager.moveCollectionToPosition(collection1.id, 0);

      expect(success).toBe(true);
    });
  });
}); 