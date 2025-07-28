import { Collection } from '../models/Collection';
import { localize } from './LocalizationService';
import * as vscode from 'vscode';

export class CollectionManager {
  private collections: Collection[] = [];

  /**
   * Converts an absolute workspace URI to a relative path
   */
  public static getRelativeWorkspaceId(
    workspaceUri?: vscode.Uri
  ): string | undefined {
    if (!workspaceUri) {
      return undefined;
    }

    try {
      // Extract the workspace name from the path
      const pathParts = workspaceUri.path
        .split('/')
        .filter(part => part.length > 0);
      if (pathParts.length === 0) {
        return undefined;
      }

      // Return the workspace name (last part of the path)
      return pathParts[pathParts.length - 1];
    } catch {
      return undefined;
    }
  }

  /**
   * Converts a relative workspace ID back to an absolute URI for comparison
   */
  public static getAbsoluteWorkspaceUri(
    relativeWorkspaceId: string | undefined
  ): vscode.Uri | undefined {
    if (!relativeWorkspaceId) {
      return undefined;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return undefined;
    }

    // Find the workspace folder that matches the relative ID
    return workspaceFolders.find(folder => {
      const folderRelativeId = this.getRelativeWorkspaceId(folder.uri);
      return folderRelativeId === relativeWorkspaceId;
    })?.uri;
  }

  /**
   * Gets the current workspace relative ID
   */
  public static getCurrentWorkspaceId(): string | undefined {
    const currentWorkspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri;
    return this.getRelativeWorkspaceId(currentWorkspaceUri);
  }

  public createCollection(
    name: string,
    workspaceId?: string
  ): Collection | null {
    // Convert absolute workspace URI to relative ID if provided
    let relativeWorkspaceId = workspaceId;
    if (workspaceId && workspaceId.includes('://')) {
      try {
        const workspaceUri = vscode.Uri.parse(workspaceId);
        relativeWorkspaceId =
          CollectionManager.getRelativeWorkspaceId(workspaceUri);
      } catch {
        // If parsing fails, use as-is
        relativeWorkspaceId = workspaceId;
      }
    }

    const existingCollection = this.collections.find(
      c => c.name === name && c.workspaceId === relativeWorkspaceId
    );
    if (existingCollection) {
      return null;
    }

    const nextOrder = this.getNextOrderForWorkspace(relativeWorkspaceId);
    const collection = new Collection(name, relativeWorkspaceId, nextOrder);
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
    // Convert absolute workspace URI to relative ID if provided
    let relativeWorkspaceId = workspaceId;
    if (workspaceId && workspaceId.includes('://')) {
      try {
        const workspaceUri = vscode.Uri.parse(workspaceId);
        relativeWorkspaceId =
          CollectionManager.getRelativeWorkspaceId(workspaceUri);
      } catch {
        // If parsing fails, use as-is
        relativeWorkspaceId = workspaceId;
      }
    }

    const workspaceCollections = this.collections.filter(
      c => c.workspaceId === relativeWorkspaceId
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
    // Convert absolute workspace URI to relative ID if provided
    let relativeWorkspaceId = workspaceId;
    if (workspaceId && workspaceId.includes('://')) {
      try {
        const workspaceUri = vscode.Uri.parse(workspaceId);
        relativeWorkspaceId =
          CollectionManager.getRelativeWorkspaceId(workspaceUri);
      } catch {
        // If parsing fails, use as-is
        relativeWorkspaceId = workspaceId;
      }
    }

    return this.collections.some(
      c => c.name === name && c.workspaceId === relativeWorkspaceId
    );
  }

  public hasCollectionForWorkspace(id: string, workspaceId?: string): boolean {
    // Convert absolute workspace URI to relative ID if provided
    let relativeWorkspaceId = workspaceId;
    if (workspaceId && workspaceId.includes('://')) {
      try {
        const workspaceUri = vscode.Uri.parse(workspaceId);
        relativeWorkspaceId =
          CollectionManager.getRelativeWorkspaceId(workspaceUri);
      } catch {
        // If parsing fails, use as-is
        relativeWorkspaceId = workspaceId;
      }
    }

    return this.collections.some(
      c => c.id === id && c.workspaceId === relativeWorkspaceId
    );
  }

  public clearAllCollections(): void {
    this.collections = [];
  }

  public clearCollectionsForWorkspace(workspaceId?: string): void {
    // Convert absolute workspace URI to relative ID if provided
    let relativeWorkspaceId = workspaceId;
    if (workspaceId && workspaceId.includes('://')) {
      try {
        const workspaceUri = vscode.Uri.parse(workspaceId);
        relativeWorkspaceId =
          CollectionManager.getRelativeWorkspaceId(workspaceUri);
      } catch {
        // If parsing fails, use as-is
        relativeWorkspaceId = workspaceId;
      }
    }

    // Remove collections that belong to this workspace
    this.collections = this.collections.filter(
      collection => collection.workspaceId !== relativeWorkspaceId
    );
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
    // Convert absolute workspace URI to relative ID if provided
    let relativeWorkspaceId = workspaceId;
    if (workspaceId && workspaceId.includes('://')) {
      try {
        const workspaceUri = vscode.Uri.parse(workspaceId);
        relativeWorkspaceId =
          CollectionManager.getRelativeWorkspaceId(workspaceUri);
      } catch {
        // If parsing fails, use as-is
        relativeWorkspaceId = workspaceId;
      }
    }

    // Look for existing ungrouped collection for this specific workspace
    const existingUngrouped = this.collections.find(
      c =>
        c.id === 'ungrouped-bookmarks' && c.workspaceId === relativeWorkspaceId
    );
    if (existingUngrouped) {
      return existingUngrouped;
    }

    // Create the "Ungrouped" collection for this workspace if it doesn't exist
    const ungrouped = new Collection(
      localize('label.ungrouped'),
      relativeWorkspaceId,
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
    // Convert absolute workspace URI to relative ID if provided
    let relativeWorkspaceId = workspaceId;
    if (workspaceId && workspaceId.includes('://')) {
      try {
        const workspaceUri = vscode.Uri.parse(workspaceId);
        relativeWorkspaceId =
          CollectionManager.getRelativeWorkspaceId(workspaceUri);
      } catch {
        // If parsing fails, use as-is
        relativeWorkspaceId = workspaceId;
      }
    }

    const workspaceCollections = this.collections.filter(
      c => c.workspaceId === relativeWorkspaceId
    );
    if (workspaceCollections.length === 0) {
      return 0;
    }

    const maxOrder = Math.max(...workspaceCollections.map(c => c.order ?? 0));
    return maxOrder + 1;
  }
}
