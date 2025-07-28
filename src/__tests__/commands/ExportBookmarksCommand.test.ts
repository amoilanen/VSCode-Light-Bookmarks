import * as vscode from 'vscode';
import { ExportBookmarksCommand } from '../../commands/ExportBookmarksCommand';
import { BookmarkManager } from '../../services/BookmarkManager';
import { CollectionManager } from '../../services/CollectionManager';
import { Collection } from '../../models/Collection';

jest.mock('vscode');

describe('ExportBookmarksCommand', () => {
  let command: ExportBookmarksCommand;
  let bookmarkManager: BookmarkManager;
  let collectionManager: CollectionManager;
  let mockShowSaveDialog: jest.SpyInstance;
  let mockWriteFile: jest.SpyInstance;
  let mockShowInformationMessage: jest.SpyInstance;
  let mockShowErrorMessage: jest.SpyInstance;

  beforeEach(() => {
    collectionManager = new CollectionManager();
    bookmarkManager = new BookmarkManager(collectionManager);
    command = new ExportBookmarksCommand(bookmarkManager, collectionManager);

    mockShowSaveDialog = jest.spyOn(vscode.window, 'showSaveDialog');
    mockWriteFile = jest.spyOn(vscode.workspace.fs, 'writeFile');
    mockShowInformationMessage = jest.spyOn(
      vscode.window,
      'showInformationMessage'
    );
    mockShowErrorMessage = jest.spyOn(vscode.window, 'showErrorMessage');

    // Mock workspace folders for relative path conversion
    (vscode.workspace as any).workspaceFolders = [
      {
        uri: {
          scheme: 'file',
          authority: '',
          path: '/workspace',
          fsPath: '/workspace',
          toString: () => 'file:///workspace',
        },
        name: 'workspace',
        index: 0,
      },
    ];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should export bookmarks and collections to JSON file for current workspace', async () => {
      // Setup test data
      const collection = new Collection('Test Collection', 'workspace');
      collectionManager.addCollection(collection);

      bookmarkManager.addBookmark(
        'file:///workspace/test.txt',
        5,
        collection.id,
        'Test bookmark'
      );

      const mockSaveUri = vscode.Uri.file('/test/export.json');
      mockShowSaveDialog.mockResolvedValue(mockSaveUri);
      mockWriteFile.mockResolvedValue(undefined);
      mockShowInformationMessage.mockResolvedValue('Open File');

      await command.execute();

      expect(mockShowSaveDialog).toHaveBeenCalledWith({
        defaultUri: expect.objectContaining({
          path: expect.stringContaining('bookmarks-export-workspace-'),
        }),
        filters: {
          'JSON Files': ['json'],
          'All Files': ['*'],
        },
        title: 'Export Bookmarks',
      });

      expect(mockWriteFile).toHaveBeenCalledWith(
        mockSaveUri,
        expect.any(Buffer)
      );

      expect(mockShowInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Bookmarks exported successfully'),
        'Open File'
      );
    });

    it('should handle user cancellation', async () => {
      mockShowSaveDialog.mockResolvedValue(undefined);

      await command.execute();

      expect(mockShowSaveDialog).toHaveBeenCalled();
      expect(mockWriteFile).not.toHaveBeenCalled();
      expect(mockShowInformationMessage).not.toHaveBeenCalled();
    });

    it('should handle export errors', async () => {
      const mockSaveUri = vscode.Uri.file('/test/export.json');
      mockShowSaveDialog.mockResolvedValue(mockSaveUri);
      mockWriteFile.mockRejectedValue(new Error('Write failed'));

      await command.execute();

      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to export bookmarks')
      );
    });

    it('should export correct JSON structure with relative paths for current workspace', async () => {
      // Setup test data
      const collection = new Collection('Test Collection', 'workspace'); // Use relative workspace ID
      collectionManager.addCollection(collection);

      bookmarkManager.addBookmark(
        'file:///workspace/test.txt',
        5,
        collection.id,
        'Test bookmark'
      );

      const mockSaveUri = vscode.Uri.file('/test/export.json');
      mockShowSaveDialog.mockResolvedValue(mockSaveUri);
      mockWriteFile.mockResolvedValue(undefined);
      mockShowInformationMessage.mockResolvedValue(undefined);

      await command.execute();

      const writeCall = mockWriteFile.mock.calls[0];
      const buffer = writeCall[1] as Buffer;
      const exportData = JSON.parse(buffer.toString('utf8'));

      expect(exportData).toHaveProperty('version', '1.0');
      expect(exportData).toHaveProperty('exportDate');
      expect(exportData).toHaveProperty('workspaceName', 'workspace');
      expect(exportData).toHaveProperty('bookmarks');
      expect(exportData).toHaveProperty('collections');
      expect(exportData.bookmarks).toHaveLength(1);
      expect(exportData.collections).toHaveLength(1);
      expect(exportData.bookmarks[0]).toMatchObject({
        uri: 'test.txt', // Should be relative path, not absolute
        line: 5,
        description: 'Test bookmark',
        collectionId: collection.id,
      });
      expect(exportData.collections[0]).toMatchObject({
        id: collection.id,
        name: 'Test Collection',
        workspaceId: 'workspace', // Should export relative workspace ID
        order: 0,
      });
      expect(exportData.collections[0]).toHaveProperty('workspaceId');
    });

    it('should not export bookmarks outside current workspace', async () => {
      // Setup test data - collection in current workspace
      const collection = new Collection('Test Collection', 'workspace');
      collectionManager.addCollection(collection);

      // Add bookmark inside workspace
      bookmarkManager.addBookmark(
        'file:///workspace/test.txt',
        5,
        collection.id,
        'Test bookmark inside workspace'
      );

      // Add bookmark outside workspace
      bookmarkManager.addBookmark(
        'file:///other/path/test.txt',
        10,
        collection.id,
        'Test bookmark outside workspace'
      );

      const mockSaveUri = vscode.Uri.file('/test/export.json');
      mockShowSaveDialog.mockResolvedValue(mockSaveUri);
      mockWriteFile.mockResolvedValue(undefined);
      mockShowInformationMessage.mockResolvedValue(undefined);

      await command.execute();

      const writeCall = mockWriteFile.mock.calls[0];
      const buffer = writeCall[1] as Buffer;
      const exportData = JSON.parse(buffer.toString('utf8'));

      // Should only export the bookmark inside the workspace
      expect(exportData.bookmarks).toHaveLength(1);
      expect(exportData.bookmarks[0]).toMatchObject({
        uri: 'test.txt', // Should be relative path
        line: 5,
        description: 'Test bookmark inside workspace',
        collectionId: collection.id,
      });
    });

    it('should handle no workspace folders', async () => {
      // Remove workspace folders mock
      (vscode.workspace as any).workspaceFolders = [];

      const collection = new Collection('Test Collection', 'workspace1');
      collectionManager.addCollection(collection);

      bookmarkManager.addBookmark(
        'file:///some/path/test.txt',
        5,
        collection.id,
        'Test bookmark'
      );

      const mockSaveUri = vscode.Uri.file('/test/export.json');
      mockShowSaveDialog.mockResolvedValue(mockSaveUri);
      mockWriteFile.mockResolvedValue(undefined);
      mockShowInformationMessage.mockResolvedValue(undefined);

      await command.execute();

      const writeCall = mockWriteFile.mock.calls[0];
      const buffer = writeCall[1] as Buffer;
      const exportData = JSON.parse(buffer.toString('utf8'));

      // Should export no bookmarks when no workspace is open
      expect(exportData.bookmarks).toHaveLength(0);
      expect(exportData.collections).toHaveLength(0);
      expect(exportData.workspaceName).toBe('no-workspace');
    });

    it('should not export collections from other workspaces', async () => {
      // Setup test data - collection in current workspace
      const currentWorkspaceCollection = new Collection(
        'Current Workspace Collection',
        'workspace'
      );
      collectionManager.addCollection(currentWorkspaceCollection);

      // Setup test data - collection in different workspace
      const otherWorkspaceCollection = new Collection(
        'Other Workspace Collection',
        'other-workspace'
      );
      collectionManager.addCollection(otherWorkspaceCollection);

      // Add bookmarks to both collections
      bookmarkManager.addBookmark(
        'file:///workspace/test.txt',
        5,
        currentWorkspaceCollection.id,
        'Test bookmark in current workspace'
      );

      bookmarkManager.addBookmark(
        'file:///other-workspace/test.txt',
        10,
        otherWorkspaceCollection.id,
        'Test bookmark in other workspace'
      );

      const mockSaveUri = vscode.Uri.file('/test/export.json');
      mockShowSaveDialog.mockResolvedValue(mockSaveUri);
      mockWriteFile.mockResolvedValue(undefined);
      mockShowInformationMessage.mockResolvedValue(undefined);

      await command.execute();

      const writeCall = mockWriteFile.mock.calls[0];
      const buffer = writeCall[1] as Buffer;
      const exportData = JSON.parse(buffer.toString('utf8'));

      // Should only export the collection and bookmark from current workspace
      expect(exportData.collections).toHaveLength(1);
      expect(exportData.bookmarks).toHaveLength(1);
      expect(exportData.collections[0]).toMatchObject({
        id: currentWorkspaceCollection.id,
        name: 'Current Workspace Collection',
        workspaceId: 'workspace',
      });
      expect(exportData.bookmarks[0]).toMatchObject({
        uri: 'test.txt',
        line: 5,
        description: 'Test bookmark in current workspace',
        collectionId: currentWorkspaceCollection.id,
      });
    });
  });
});
