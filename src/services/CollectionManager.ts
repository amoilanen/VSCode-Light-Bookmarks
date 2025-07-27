import { Collection } from '../models/Collection';
import { localize } from './LocalizationService';

export class CollectionManager {
  private collections: Collection[] = [];

  public createCollection(
    name: string,
    workspaceId?: string
  ): Collection | null {
    const existingCollection = this.collections.find(
      c => c.name === name && c.workspaceId === workspaceId
    );
    if (existingCollection) {
      return null;
    }

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

  public getAllCollections(): Collection[] {
    return [...this.collections];
  }

  public getCollectionsForWorkspace(workspaceId?: string): Collection[] {
    const workspaceCollections = this.collections.filter(
      c => c.workspaceId === workspaceId
    );
    return workspaceCollections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  public addCollection(collection: Collection): void {
    const existingById = this.collections.find(c => c.id === collection.id);
    if (existingById) {
      return;
    }

    this.collections.push(collection);
  }

  public hasCollectionByName(name: string, workspaceId?: string): boolean {
    return this.collections.some(
      c => c.name === name && c.workspaceId === workspaceId
    );
  }

  public hasCollectionForWorkspace(id: string, workspaceId?: string): boolean {
    return this.collections.some(
      c => c.id === id && c.workspaceId === workspaceId
    );
  }

  public clearAllCollections(): void {
    this.collections = [];
  }

  public moveCollectionUp(collectionId: string): boolean {
    const collection = this.getCollection(collectionId);
    if (!collection) {
      return false;
    }

    // Get a sorted copy, but operate on the real objects
    const workspaceCollections = this.collections.filter(
      c => c.workspaceId === collection.workspaceId
    );
    workspaceCollections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const currentIndex = workspaceCollections.findIndex(
      c => c.id === collectionId
    );

    if (currentIndex <= 0) {
      return false; // Already at the top
    }

    // Swap order values
    const previousCollection = workspaceCollections[currentIndex - 1];
    const collectionOrderBefore = collection.order;
    collection.order = previousCollection.order;
    previousCollection.order = collectionOrderBefore;

    // Re-normalize order values
    workspaceCollections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    workspaceCollections.forEach((col, idx) => {
      col.order = idx;
    });

    return true;
  }

  public moveCollectionDown(collectionId: string): boolean {
    const collection = this.getCollection(collectionId);
    if (!collection) {
      return false;
    }

    // Get a sorted copy, but operate on the real objects
    const workspaceCollections = this.collections.filter(
      c => c.workspaceId === collection.workspaceId
    );
    workspaceCollections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const currentIndex = workspaceCollections.findIndex(
      c => c.id === collectionId
    );

    if (
      currentIndex === -1 ||
      currentIndex >= workspaceCollections.length - 1
    ) {
      return false; // Already at the bottom
    }

    // Swap order values
    const nextCollection = workspaceCollections[currentIndex + 1];
    const collectionOrderBefore = collection.order;
    collection.order = nextCollection.order;
    nextCollection.order = collectionOrderBefore;

    // Re-normalize order values
    workspaceCollections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    workspaceCollections.forEach((col, idx) => {
      col.order = idx;
    });

    return true;
  }

  /**
   * Ensure the "Ungrouped" collection exists for a workspace
   */
  public ensureUngroupedCollection(workspaceId?: string): Collection {
    // Look for existing ungrouped collection for this specific workspace
    const existingUngrouped = this.collections.find(
      c => c.id === 'ungrouped-bookmarks' && c.workspaceId === workspaceId
    );
    if (existingUngrouped) {
      return existingUngrouped;
    }

    // Create the "Ungrouped" collection for this workspace if it doesn't exist
    const ungrouped = new Collection(
      localize('label.ungrouped'),
      workspaceId,
      0
    );
    Object.defineProperty(ungrouped, 'id', {
      value: 'ungrouped-bookmarks',
      writable: false,
    });
    this.collections.push(ungrouped);
    return ungrouped;
  }

  private getNextOrderForWorkspace(workspaceId?: string): number {
    const workspaceCollections = this.getCollectionsForWorkspace(workspaceId);
    if (workspaceCollections.length === 0) {
      return 0;
    }

    const maxOrder = Math.max(...workspaceCollections.map(c => c.order ?? 0));
    return maxOrder + 1;
  }
}
