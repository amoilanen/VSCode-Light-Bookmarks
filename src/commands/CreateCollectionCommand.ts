import * as vscode from 'vscode';
import { CollectionManager } from '../services/CollectionManager';
import { StorageService } from '../services/StorageService';
import { BookmarkTreeDataProvider } from '../providers/BookmarkTreeDataProvider';
import { localize } from '../services/LocalizationService';

export class CreateCollectionCommand {
  constructor(
    private collectionManager: CollectionManager,
    private storageService: StorageService,
    private treeDataProvider: BookmarkTreeDataProvider
  ) {}

  public async execute(): Promise<void> {
    // Get collection name from user using QuickPick for better view integration
    const collectionName = await this.getCollectionNameFromUser();
    if (!collectionName) {
      return; // User cancelled
    }

    // Create the collection
    const workspaceId = vscode.workspace.workspaceFolders?.[0]?.uri.toString();
    const collection = this.collectionManager.createCollection(
      collectionName.trim(),
      workspaceId
    );

    if (collection) {
      // Save to storage
      await this.storageService.saveCollections(
        this.collectionManager.getAllCollections()
      );

      // Refresh only the root level to show the new collection
      this.treeDataProvider.refreshRoot();
    } else {
      vscode.window.showErrorMessage(
        localize('message.failedToCreateCollection')
      );
    }
  }

  private async getCollectionNameFromUser(): Promise<string | undefined> {
    // Use QuickPick with custom input for better view integration
    const quickPick = vscode.window.createQuickPick();
    quickPick.title = localize('prompt.createCollection');
    quickPick.placeholder = localize('prompt.enterCollectionName');
    quickPick.canSelectMany = false;
    quickPick.ignoreFocusOut = true;

    return new Promise(resolve => {
      quickPick.onDidAccept(() => {
        const value = quickPick.value.trim();
        if (!value || value.length === 0) {
          vscode.window.showErrorMessage(
            localize('validation.collectionNameEmpty')
          );
          return;
        }
        const workspaceId =
          vscode.workspace.workspaceFolders?.[0]?.uri.toString();
        if (this.collectionManager.hasCollectionByName(value, workspaceId)) {
          vscode.window.showErrorMessage(
            localize('message.collectionAlreadyExists')
          );
          return;
        }
        quickPick.hide();
        resolve(value);
      });

      quickPick.onDidHide(() => {
        resolve(undefined);
      });

      quickPick.show();
    });
  }
}
