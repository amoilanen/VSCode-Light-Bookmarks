import * as vscode from 'vscode';
import { BookmarkManager } from '../services/BookmarkManager';
import { CollectionManager } from '../services/CollectionManager';
import { StorageService } from '../services/StorageService';
import { Bookmark } from '../models/Bookmark';
import { Collection } from '../models/Collection';
import { localize } from '../services/LocalizationService';

export class EmptyStateTreeItem extends vscode.TreeItem {
  constructor() {
    super(localize('label.noBookmarks'), vscode.TreeItemCollapsibleState.None);
    this.tooltip = new vscode.MarkdownString(
      localize('label.addFirstBookmarkTooltip')
    );
    this.tooltip.isTrusted = true;
    this.iconPath = new vscode.ThemeIcon('info');
    this.contextValue = 'empty-state';
    this.description = localize('label.addFirstBookmark');
  }
}

export class CodeLineTreeItem extends vscode.TreeItem {
  constructor(
    public readonly codeLine: string,
    public readonly lineNumber: number,
    public readonly bookmark: Bookmark
  ) {
    super(codeLine, vscode.TreeItemCollapsibleState.None);
    this.tooltip = `Line ${lineNumber}: ${codeLine}`;

    // Only show line number in description if the setting is enabled
    const showLineNumbers = vscode.workspace
      .getConfiguration('lightBookmarks')
      .get<boolean>('showLineNumbers', true);
    this.description = showLineNumbers
      ? localize('label.line') + ` ${lineNumber}`
      : undefined;

    this.contextValue = 'code-line';
    this.command = {
      command: 'vscode.open',
      title: 'Open Bookmark',
      arguments: [
        vscode.Uri.parse(bookmark.uri),
        {
          selection: new vscode.Range(
            bookmark.line - 1,
            0,
            bookmark.line - 1,
            0
          ),
        },
      ],
    };
  }
}

export class BookmarkTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly bookmark?: Bookmark,
    public readonly collection?: Collection
  ) {
    super(label, collapsibleState);

    if (bookmark) {
      this.tooltip = `${bookmark.uri}:${bookmark.line}`;
      this.iconPath = new vscode.ThemeIcon('bookmark');
      // Set different context values based on whether bookmark is in a collection
      this.contextValue = 'bookmark-in-collection';
      this.command = {
        command: 'vscode.open',
        title: 'Open Bookmark',
        arguments: [
          vscode.Uri.parse(bookmark.uri),
          {
            selection: new vscode.Range(
              bookmark.line - 1,
              0,
              bookmark.line - 1,
              0
            ),
          },
        ],
      };
      // Add command arguments for context menu actions
      this.resourceUri = vscode.Uri.parse(
        `bookmark://${bookmark.uri}:${bookmark.line}`
      );

      // Add hover actions for bookmark items with description
      const showLineNumbers = vscode.workspace
        .getConfiguration('lightBookmarks')
        .get<boolean>('showLineNumbers', true);
      const lineInfo = showLineNumbers ? `:${bookmark.line}` : '';
      const description = bookmark.description
        ? `\n\n**Description:** ${bookmark.description}`
        : '';
      this.tooltip = new vscode.MarkdownString(
        `${bookmark.uri}${lineInfo}${description}\n\n**${localize('tooltip.clickToOpen')}**`
      );
      this.tooltip.isTrusted = true;
    } else if (collection) {
      this.tooltip = collection.name;
      this.iconPath = new vscode.ThemeIcon('folder');
      // All collections can now be deleted, including "Ungrouped"
      this.contextValue = 'collection';
      this.resourceUri = vscode.Uri.parse(`collection://${collection.id}`);
      this.tooltip = new vscode.MarkdownString(
        `${collection.name}\n\n**${localize('tooltip.clickToExpand')}**`
      );
      this.tooltip.isTrusted = true;
    }
  }
}

export class BookmarkTreeDataProvider
  implements
    vscode.TreeDataProvider<
      BookmarkTreeItem | CodeLineTreeItem | EmptyStateTreeItem
    >
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    | BookmarkTreeItem
    | CodeLineTreeItem
    | EmptyStateTreeItem
    | undefined
    | null
    | void
  > = new vscode.EventEmitter<
    | BookmarkTreeItem
    | CodeLineTreeItem
    | EmptyStateTreeItem
    | undefined
    | null
    | void
  >();
  readonly onDidChangeTreeData: vscode.Event<
    | BookmarkTreeItem
    | CodeLineTreeItem
    | EmptyStateTreeItem
    | undefined
    | null
    | void
  > = this._onDidChangeTreeData.event;

  private treeView:
    | vscode.TreeView<BookmarkTreeItem | CodeLineTreeItem | EmptyStateTreeItem>
    | undefined;

  // Track expanded state for all tree levels
  private expandedCollections: Set<string> = new Set();
  private expandedBookmarks: Set<string> = new Set(); // key: `${uri}:${line}`

  constructor(
    private bookmarkManager: BookmarkManager,
    private collectionManager: CollectionManager,
    private storageService?: StorageService
  ) {}

  public setTreeView(
    treeView: vscode.TreeView<
      BookmarkTreeItem | CodeLineTreeItem | EmptyStateTreeItem
    >
  ): void {
    this.treeView = treeView;
  }

  // Methods to track expanded/collapsed state
  public markCollectionExpanded(collectionId: string): void {
    this.expandedCollections.add(collectionId);
  }

  public markCollectionCollapsed(collectionId: string): void {
    this.expandedCollections.delete(collectionId);
  }

  public markBookmarkExpanded(bookmarkKey: string): void {
    this.expandedBookmarks.add(bookmarkKey);
  }

  public markBookmarkCollapsed(bookmarkKey: string): void {
    this.expandedBookmarks.delete(bookmarkKey);
  }

  public getExpandedCollections(): string[] {
    return Array.from(this.expandedCollections);
  }

  public getExpandedBookmarks(): string[] {
    return Array.from(this.expandedBookmarks);
  }

  public isCollectionExpanded(collectionId: string): boolean {
    return this.expandedCollections.has(collectionId);
  }

  public isBookmarkExpanded(bookmarkKey: string): boolean {
    return this.expandedBookmarks.has(bookmarkKey);
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Refresh only a specific element and its children, preserving expanded state
   */
  public refreshElement(element?: BookmarkTreeItem | CodeLineTreeItem): void {
    this._onDidChangeTreeData.fire(element);
  }

  /**
   * Refresh only the root level, preserving expanded state of collections
   */
  public refreshRoot(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Refresh a specific collection and its bookmarks, preserving expanded state
   */
  public refreshCollection(collection: Collection): void {
    // Get the current bookmarks to determine if the collection should be collapsible
    const collectionBookmarks = this.bookmarkManager
      .getBookmarksByCollection(collection.id)
      .filter(bookmark => this.isBookmarkInCurrentWorkspace(bookmark));

    // Determine the collapsible state based on whether it was previously expanded
    const collapsibleState = this.isCollectionExpanded(collection.id)
      ? vscode.TreeItemCollapsibleState.Expanded
      : collectionBookmarks.length > 0
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None;

    const collectionItem = new BookmarkTreeItem(
      collection.name,
      collapsibleState,
      undefined,
      collection
    );
    this._onDidChangeTreeData.fire(collectionItem);
  }

  public getTreeItem(
    element: BookmarkTreeItem | CodeLineTreeItem | EmptyStateTreeItem
  ): vscode.TreeItem {
    return element;
  }

  public getChildren(
    element?: BookmarkTreeItem | CodeLineTreeItem | EmptyStateTreeItem
  ): Thenable<(BookmarkTreeItem | CodeLineTreeItem | EmptyStateTreeItem)[]> {
    if (!element) {
      // Root level - show collections and ungrouped bookmarks
      return this.getRootItems();
    } else if ('collection' in element && element.collection) {
      // Collection level - show bookmarks in this collection
      return this.getCollectionBookmarks(element.collection);
    } else if ('bookmark' in element && element.bookmark) {
      // Bookmark level - show the code line
      return this.getBookmarkCodeLine(element.bookmark);
    } else {
      // No children for code line items
      return Promise.resolve([]);
    }
  }

  public async getRootItems(): Promise<
    (BookmarkTreeItem | EmptyStateTreeItem)[]
  > {
    const items: (BookmarkTreeItem | EmptyStateTreeItem)[] = [];
    const currentWorkspaceId =
      vscode.workspace.workspaceFolders?.[0]?.uri.toString();
    const collections =
      this.collectionManager.getCollectionsForWorkspace(currentWorkspaceId);
    const allBookmarks = this.bookmarkManager.getAllBookmarks();

    // Filter bookmarks to only include those from the current workspace
    const workspaceBookmarks = allBookmarks.filter(bookmark =>
      this.isBookmarkInCurrentWorkspace(bookmark)
    );
    const hasAnyBookmarks = workspaceBookmarks.length > 0;
    if (!hasAnyBookmarks) {
      return [new EmptyStateTreeItem()];
    }
    // Add all collections for the current workspace (including ungrouped)
    for (const collection of collections) {
      // Always use getBookmarksByCollection for all collections
      const collectionBookmarks = this.bookmarkManager
        .getBookmarksByCollection(collection.id)
        .filter(bookmark => this.isBookmarkInCurrentWorkspace(bookmark));
      // Set collapsible state based on whether it was previously expanded
      const collapsibleState = this.isCollectionExpanded(collection.id)
        ? vscode.TreeItemCollapsibleState.Expanded
        : collectionBookmarks.length > 0
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None;
      items.push(
        new BookmarkTreeItem(
          `${collection.name} (${collectionBookmarks.length})`,
          collapsibleState,
          undefined,
          collection
        )
      );
    }
    return items;
  }

  private async getCollectionBookmarks(
    collection: Collection
  ): Promise<BookmarkTreeItem[]> {
    const bookmarks = this.bookmarkManager.getBookmarksByCollection(
      collection.id
    );
    // Filter bookmarks to only include those from the current workspace, preserving order
    const workspaceBookmarks = bookmarks.filter(bookmark =>
      this.isBookmarkInCurrentWorkspace(bookmark)
    );
    return workspaceBookmarks.map(bookmark => {
      const fileName = this.getFileName(bookmark.uri);
      const bookmarkKey = `${bookmark.uri}:${bookmark.line}`;
      // Set collapsible state based on whether it was previously expanded
      const collapsibleState = this.isBookmarkExpanded(bookmarkKey)
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.Collapsed;
      // Show line numbers in label based on setting
      const showLineNumbers = vscode.workspace
        .getConfiguration('lightBookmarks')
        .get<boolean>('showLineNumbers', true);
      const label = showLineNumbers ? `${fileName}:${bookmark.line}` : fileName;
      return new BookmarkTreeItem(label, collapsibleState, bookmark);
    });
  }

  private async getBookmarkCodeLine(
    bookmark: Bookmark
  ): Promise<CodeLineTreeItem[]> {
    try {
      const uri = vscode.Uri.parse(bookmark.uri);
      const document = await vscode.workspace.openTextDocument(uri);
      const line = document.lineAt(bookmark.line - 1); // Convert to 0-based index
      const codeLine = line.text.trim();

      return [new CodeLineTreeItem(codeLine, bookmark.line, bookmark)];
    } catch (error) {
      // If we can't read the file or line, return an error message
      return [
        new CodeLineTreeItem(
          localize('label.unableToReadCodeLine'),
          bookmark.line,
          bookmark
        ),
      ];
    }
  }

  private isBookmarkInCurrentWorkspace(bookmark: Bookmark): boolean {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      // If no workspace is open, show all bookmarks
      return true;
    }

    try {
      const bookmarkUri = vscode.Uri.parse(bookmark.uri);

      // Check if the bookmark URI is within any of the current workspace folders
      return workspaceFolders.some(folder => {
        const folderUri = folder.uri;
        return (
          bookmarkUri.scheme === folderUri.scheme &&
          bookmarkUri.authority === folderUri.authority &&
          bookmarkUri.path.startsWith(folderUri.path)
        );
      });
    } catch {
      // If URI parsing fails, don't show the bookmark
      return false;
    }
  }

  private getFileName(uri: string): string {
    try {
      const path = vscode.Uri.parse(uri).path;
      return path.split('/').pop() || localize('label.unknown');
    } catch {
      return localize('label.unknown');
    }
  }
}
