import * as vscode from 'vscode';

export class OpenSettingsCommand {
  execute(): void {
    // Open the extension settings with a search filter
    // This will show all settings related to light bookmarks
    vscode.commands.executeCommand(
      'workbench.action.openSettings',
      'light bookmarks'
    );
  }
}
