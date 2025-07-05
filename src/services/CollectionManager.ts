import { Collection } from '../models/Collection';

export class CollectionManager {
  private collections: Collection[] = [];

  public createCollection(name: string, workspaceId?: string): Collection | null {
    // Check if collection with same name already exists in the same workspace
    const existingCollection = this.collections.find(c => c.name === name && c.workspaceId === workspaceId);
    if (existingCollection) {
      return null;
    }

    // Get the next order number for this workspace
    const nextOrder = this.getNextOrderForWorkspace(workspaceId);
    const collection = new Collection(name, workspaceId, nextOrder);
    this.collections.push(collection);
    return collection;
  }

  public deleteCollection(id: string): boolean {
    const index = this.collections.findIndex(c => c.id === id);
    if (index === -1) {
      return false;
    }

    this.collections.splice(index, 1);
    return true;
  }

  public getCollection(id: string): Collection | undefined {
    return this.collections.find(c => c.id === id);
  }

  public getCollectionByName(name: string): Collection | undefined {
    return this.collections.find(c => c.name === name);
  }

  public getAllCollections(): Collection[] {
    return [...this.collections];
  }

  public getCollectionsForWorkspace(workspaceId?: string): Collection[] {
    const workspaceCollections = this.collections.filter(c => c.workspaceId === workspaceId);
    return workspaceCollections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  public addCollection(collection: Collection): void {
    this.collections.push(collection);
  }

  public clearAllCollections(): void {
    this.collections = [];
  }

  public hasCollection(id: string): boolean {
    return this.collections.some(c => c.id === id);
  }

  public hasCollectionForWorkspace(id: string, workspaceId?: string): boolean {
    return this.collections.some(c => c.id === id && c.workspaceId === workspaceId);
  }

  public hasCollectionByName(name: string): boolean {
    return this.collections.some(c => c.name === name);
  }

  /**
   * Move a collection up in the order
   */
  public moveCollectionUp(collectionId: string): boolean {
    const collection = this.getCollection(collectionId);
    if (!collection) {
      return false;
    }

    // Get a sorted copy, but operate on the real objects
    const workspaceCollections = this.collections.filter(c => c.workspaceId === collection.workspaceId);
    workspaceCollections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const currentIndex = workspaceCollections.findIndex(c => c.id === collectionId);
    
    if (currentIndex <= 0) {
      return false; // Already at the top
    }

    // Swap order values
    const previousCollection = workspaceCollections[currentIndex - 1];
    const tempOrder = collection.order;
    collection.order = previousCollection.order;
    previousCollection.order = tempOrder;

    // Re-normalize order values
    workspaceCollections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    workspaceCollections.forEach((col, idx) => {
      col.order = idx * 10;
    });

    return true;
  }

  /**
   * Move a collection down in the order
   */
  public moveCollectionDown(collectionId: string): boolean {
    const collection = this.getCollection(collectionId);
    if (!collection) {
      return false;
    }

    // Get a sorted copy, but operate on the real objects
    const workspaceCollections = this.collections.filter(c => c.workspaceId === collection.workspaceId);
    workspaceCollections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const currentIndex = workspaceCollections.findIndex(c => c.id === collectionId);
    
    if (currentIndex === -1 || currentIndex >= workspaceCollections.length - 1) {
      return false; // Already at the bottom
    }

    // Swap order values
    const nextCollection = workspaceCollections[currentIndex + 1];
    const tempOrder = collection.order;
    collection.order = nextCollection.order;
    nextCollection.order = tempOrder;

    // Re-normalize order values
    workspaceCollections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    workspaceCollections.forEach((col, idx) => {
      col.order = idx * 10;
    });

    return true;
  }

  /**
   * Move a collection to a specific position
   */
  public moveCollectionToPosition(collectionId: string, newPosition: number): boolean {
    const collection = this.getCollection(collectionId);
    if (!collection) {
      return false;
    }

    const workspaceCollections = this.getCollectionsForWorkspace(collection.workspaceId);
    const currentIndex = workspaceCollections.findIndex(c => c.id === collectionId);
    
    if (currentIndex === -1 || newPosition < 0 || newPosition >= workspaceCollections.length) {
      return false;
    }

    if (currentIndex === newPosition) {
      return true; // Already at the target position
    }

    // Remove the collection from its current position
    workspaceCollections.splice(currentIndex, 1);
    
    // Insert it at the new position
    workspaceCollections.splice(newPosition, 0, collection);
    
    // Update all order values to maintain consistency
    workspaceCollections.forEach((col, index) => {
      col.order = index * 10; // Use increments of 10 to allow for future insertions
    });

    return true;
  }

  /**
   * Ensure the "Ungrouped" collection exists for a workspace
   */
  public ensureUngroupedCollection(workspaceId?: string): Collection {
    // Look for existing ungrouped collection for this specific workspace
    const existingUngrouped = this.collections.find(c => c.id === 'ungrouped-bookmarks' && c.workspaceId === workspaceId);
    if (existingUngrouped) {
      return existingUngrouped;
    }

    // Create the "Ungrouped" collection for this workspace if it doesn't exist
    const ungrouped = new Collection('Ungrouped', workspaceId, 0);
    Object.defineProperty(ungrouped, 'id', { value: 'ungrouped-bookmarks', writable: false });
    this.collections.push(ungrouped);
    return ungrouped;
  }

  /**
   * Get the next order number for a workspace
   */
  private getNextOrderForWorkspace(workspaceId?: string): number {
    const workspaceCollections = this.getCollectionsForWorkspace(workspaceId);
    if (workspaceCollections.length === 0) {
      return 0;
    }
    
    // Handle collections that might not have an order property (backward compatibility)
    const maxOrder = Math.max(...workspaceCollections.map(c => c.order ?? 0));
    return maxOrder + 10; // Use increments of 10 to allow for future insertions
  }
} 