import * as vscode from 'vscode';
import { CollectionManager } from '../services/CollectionManager';
import { StorageService } from '../services/StorageService';
import { BookmarkTreeDataProvider } from '../providers/BookmarkTreeDataProvider';

export class MoveCollectionUpCommand {
  constructor(
    private collectionManager: CollectionManager,
    private storageService: StorageService,
    private treeDataProvider: BookmarkTreeDataProvider
  ) {}

  public async execute(collectionId: string): Promise<void> {
    const success = this.collectionManager.moveCollectionUp(collectionId);

    if (success) {
      // Save to storage
      await this.storageService.saveCollections(
        this.collectionManager.getAllCollections()
      );

      // Refresh the tree view to reflect the new order
      this.treeDataProvider.refreshRoot();
    } else {
      vscode.window.showInformationMessage(
        'Collection is already at the top or cannot be moved'
      );
    }
  }
}
