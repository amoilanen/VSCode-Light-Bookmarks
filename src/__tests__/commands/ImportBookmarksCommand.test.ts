import * as vscode from 'vscode';
import { ImportBookmarksCommand } from '../../commands/ImportBookmarksCommand';
import { BookmarkManager } from '../../services/BookmarkManager';
import { CollectionManager } from '../../services/CollectionManager';
import { StorageService } from '../../services/StorageService';
import { BookmarkTreeDataProvider } from '../../providers/BookmarkTreeDataProvider';
import { BookmarkDecorationProvider } from '../../providers/BookmarkDecorationProvider';
import { Collection } from '../../models/Collection';

jest.mock('vscode');

describe('ImportBookmarksCommand', () => {
  let command: ImportBookmarksCommand;
  let bookmarkManager: BookmarkManager;
  let collectionManager: CollectionManager;
  let storageService: StorageService;
  let treeDataProvider: BookmarkTreeDataProvider;
  let decorationProvider: BookmarkDecorationProvider;
  let mockShowOpenDialog: jest.SpyInstance;
  let mockReadFile: jest.SpyInstance;
  let mockShowQuickPick: jest.SpyInstance;
  let mockShowInformationMessage: jest.SpyInstance;
  let mockShowErrorMessage: jest.SpyInstance;

  beforeEach(() => {
    collectionManager = new CollectionManager();
    bookmarkManager = new BookmarkManager(collectionManager);
    storageService = new StorageService({} as any);
    treeDataProvider = new BookmarkTreeDataProvider(
      bookmarkManager,
      collectionManager,
      storageService
    );
    decorationProvider = new BookmarkDecorationProvider(
      bookmarkManager,
      collectionManager
    );

    command = new ImportBookmarksCommand(
      bookmarkManager,
      collectionManager,
      storageService,
      treeDataProvider,
      decorationProvider
    );

    mockShowOpenDialog = jest.spyOn(vscode.window, 'showOpenDialog');
    mockReadFile = jest.spyOn(vscode.workspace.fs, 'readFile');
    mockShowQuickPick = jest.spyOn(vscode.window, 'showQuickPick');
    mockShowInformationMessage = jest.spyOn(
      vscode.window,
      'showInformationMessage'
    );
    mockShowErrorMessage = jest.spyOn(vscode.window, 'showErrorMessage');

    // Mock workspace folders for relative path conversion
    (vscode.workspace as any).workspaceFolders = [
      {
        uri: vscode.Uri.file('/workspace'),
        name: 'workspace',
        index: 0,
      },
    ];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const sampleImportData = {
      version: '1.0',
      exportDate: '2023-01-01T00:00:00.000Z',
      bookmarks: [
        {
          uri: 'test.txt', // Relative path
          line: 5,
          description: 'Test bookmark',
          collectionId: 'test-collection-id',
          order: 0,
          createdAt: '2023-01-01T00:00:00.000Z',
        },
      ],
      collections: [
        {
          id: 'test-collection-id',
          name: 'Test Collection',
          order: 0,
          createdAt: '2023-01-01T00:00:00.000Z',
        },
      ],
    };

    const sampleImportDataWithAbsolutePaths = {
      version: '1.0',
      exportDate: '2023-01-01T00:00:00.000Z',
      bookmarks: [
        {
          uri: 'file:///workspace/test.txt', // Absolute path
          line: 5,
          description: 'Test bookmark',
          collectionId: 'test-collection-id',
          order: 0,
          createdAt: '2023-01-01T00:00:00.000Z',
        },
      ],
      collections: [
        {
          id: 'test-collection-id',
          name: 'Test Collection',
          order: 0,
          createdAt: '2023-01-01T00:00:00.000Z',
        },
      ],
    };

    it('should import bookmarks and collections successfully with relative paths', async () => {
      const mockOpenUri = vscode.Uri.file('/test/import.json');
      mockShowOpenDialog.mockResolvedValue([mockOpenUri]);
      mockReadFile.mockResolvedValue(
        Buffer.from(JSON.stringify(sampleImportData))
      );
      mockShowQuickPick.mockResolvedValue({ value: 'merge' });

      jest.spyOn(storageService, 'saveBookmarks').mockResolvedValue();
      jest.spyOn(storageService, 'saveCollections').mockResolvedValue();
      jest.spyOn(treeDataProvider, 'refresh').mockImplementation();
      jest.spyOn(decorationProvider, 'updateDecorations').mockImplementation();

      await command.execute();

      expect(mockShowOpenDialog).toHaveBeenCalledWith({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          'JSON Files': ['json'],
          'All Files': ['*'],
        },
        title: 'Import Bookmarks',
      });

      expect(mockShowQuickPick).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ value: 'replace' }),
          expect.objectContaining({ value: 'merge' }),
        ]),
        expect.objectContaining({ title: 'Import Options' })
      );

      // Verify that the bookmark was added with an absolute URI
      const bookmarks = bookmarkManager.getAllBookmarks();
      expect(bookmarks).toHaveLength(1);
      expect(bookmarks[0].uri).toBe('file:///workspace/test.txt'); // Should be converted to absolute

      expect(mockShowInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Import completed')
      );
    });

    it('should import bookmarks and collections successfully with absolute paths', async () => {
      const mockOpenUri = vscode.Uri.file('/test/import.json');
      mockShowOpenDialog.mockResolvedValue([mockOpenUri]);
      mockReadFile.mockResolvedValue(
        Buffer.from(JSON.stringify(sampleImportDataWithAbsolutePaths))
      );
      mockShowQuickPick.mockResolvedValue({ value: 'merge' });

      jest.spyOn(storageService, 'saveBookmarks').mockResolvedValue();
      jest.spyOn(storageService, 'saveCollections').mockResolvedValue();
      jest.spyOn(treeDataProvider, 'refresh').mockImplementation();
      jest.spyOn(decorationProvider, 'updateDecorations').mockImplementation();

      await command.execute();

      // Verify that the bookmark was added with the original absolute URI
      const bookmarks = bookmarkManager.getAllBookmarks();
      expect(bookmarks).toHaveLength(1);
      expect(bookmarks[0].uri).toBe('file:///workspace/test.txt'); // Should remain absolute

      expect(mockShowInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Import completed')
      );
    });

    it('should handle user cancellation on file selection', async () => {
      mockShowOpenDialog.mockResolvedValue(undefined);

      await command.execute();

      expect(mockShowOpenDialog).toHaveBeenCalled();
      expect(mockReadFile).not.toHaveBeenCalled();
      expect(mockShowQuickPick).not.toHaveBeenCalled();
    });

    it('should handle user cancellation on import options', async () => {
      const mockOpenUri = vscode.Uri.file('/test/import.json');
      mockShowOpenDialog.mockResolvedValue([mockOpenUri]);
      mockReadFile.mockResolvedValue(
        Buffer.from(JSON.stringify(sampleImportData))
      );
      mockShowQuickPick.mockResolvedValue(undefined);

      await command.execute();

      expect(mockShowOpenDialog).toHaveBeenCalled();
      expect(mockShowQuickPick).toHaveBeenCalled();
      expect(mockShowInformationMessage).not.toHaveBeenCalled();
    });

    it('should handle invalid JSON format', async () => {
      const mockOpenUri = vscode.Uri.file('/test/import.json');
      mockShowOpenDialog.mockResolvedValue([mockOpenUri]);
      mockReadFile.mockResolvedValue(Buffer.from('invalid json'));

      await command.execute();

      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        'Invalid JSON file format'
      );
    });

    it('should handle invalid bookmark export format', async () => {
      const mockOpenUri = vscode.Uri.file('/test/import.json');
      mockShowOpenDialog.mockResolvedValue([mockOpenUri]);
      mockReadFile.mockResolvedValue(
        Buffer.from(
          JSON.stringify({
            version: '1.0',
            exportDate: '2023-01-01T00:00:00.000Z',
            bookmarks: 'invalid format',
            collections: [],
          })
        )
      );

      await command.execute();

      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        'Invalid bookmark export file format'
      );
    });

    it('should replace all bookmarks when replace option is selected', async () => {
      // Add some existing data
      const existingCollection = new Collection(
        'Existing Collection',
        'workspace1'
      );
      collectionManager.addCollection(existingCollection);
      bookmarkManager.addBookmark(
        'file:///workspace/existing.txt',
        1,
        existingCollection.id
      );

      const mockOpenUri = vscode.Uri.file('/test/import.json');
      mockShowOpenDialog.mockResolvedValue([mockOpenUri]);
      mockReadFile.mockResolvedValue(
        Buffer.from(JSON.stringify(sampleImportData))
      );
      mockShowQuickPick.mockResolvedValue({ value: 'replace' });

      jest.spyOn(storageService, 'saveBookmarks').mockResolvedValue();
      jest.spyOn(storageService, 'saveCollections').mockResolvedValue();
      jest.spyOn(treeDataProvider, 'refresh').mockImplementation();
      jest.spyOn(decorationProvider, 'updateDecorations').mockImplementation();

      await command.execute();

      // Check that existing data was cleared
      expect(collectionManager.getAllCollections()).toHaveLength(1); // Only the imported collection
      expect(bookmarkManager.getAllBookmarks()).toHaveLength(1); // Only the imported bookmark

      expect(mockShowInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining(
          'Import completed! Imported 1 bookmarks and 1 collections.'
        )
      );
    });

    it('should merge bookmarks when merge option is selected', async () => {
      // Add some existing data
      const existingCollection = new Collection(
        'Existing Collection',
        'workspace1'
      );
      collectionManager.addCollection(existingCollection);
      bookmarkManager.addBookmark(
        'file:///workspace/existing.txt',
        1,
        existingCollection.id
      );

      const mockOpenUri = vscode.Uri.file('/test/import.json');
      mockShowOpenDialog.mockResolvedValue([mockOpenUri]);
      mockReadFile.mockResolvedValue(
        Buffer.from(JSON.stringify(sampleImportData))
      );
      mockShowQuickPick.mockResolvedValue({ value: 'merge' });

      jest.spyOn(storageService, 'saveBookmarks').mockResolvedValue();
      jest.spyOn(storageService, 'saveCollections').mockResolvedValue();
      jest.spyOn(treeDataProvider, 'refresh').mockImplementation();
      jest.spyOn(decorationProvider, 'updateDecorations').mockImplementation();

      await command.execute();

      // Check that existing data was preserved
      expect(collectionManager.getAllCollections()).toHaveLength(2); // Existing + imported
      expect(bookmarkManager.getAllBookmarks()).toHaveLength(2); // Existing + imported

      expect(mockShowInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining(
          'Import completed! Added 1 new bookmarks and 1 new collections.'
        )
      );
    });

    it('should handle no workspace folders during import', async () => {
      // Remove workspace folders mock
      (vscode.workspace as any).workspaceFolders = [];

      const importDataWithRelativePath = {
        version: '1.0',
        exportDate: '2023-01-01T00:00:00.000Z',
        bookmarks: [
          {
            uri: 'test.txt', // Relative path
            line: 5,
            description: 'Test bookmark',
            collectionId: 'test-collection-id',
            order: 0,
            createdAt: '2023-01-01T00:00:00.000Z',
          },
        ],
        collections: [
          {
            id: 'test-collection-id',
            name: 'Test Collection',
            order: 0,
            createdAt: '2023-01-01T00:00:00.000Z',
          },
        ],
      };

      const mockOpenUri = vscode.Uri.file('/test/import.json');
      mockShowOpenDialog.mockResolvedValue([mockOpenUri]);
      mockReadFile.mockResolvedValue(
        Buffer.from(JSON.stringify(importDataWithRelativePath))
      );
      mockShowQuickPick.mockResolvedValue({ value: 'merge' });

      jest.spyOn(storageService, 'saveBookmarks').mockResolvedValue();
      jest.spyOn(storageService, 'saveCollections').mockResolvedValue();
      jest.spyOn(treeDataProvider, 'refresh').mockImplementation();
      jest.spyOn(decorationProvider, 'updateDecorations').mockImplementation();

      await command.execute();

      // Verify that the bookmark was added with the relative path as-is
      const bookmarks = bookmarkManager.getAllBookmarks();
      expect(bookmarks).toHaveLength(1);
      expect(bookmarks[0].uri).toBe('test.txt'); // Should remain as-is when no workspace

      // Verify that the collection is assigned no workspaceId when no workspace folders exist
      const collections = collectionManager.getAllCollections();
      expect(collections).toHaveLength(1);
      expect(collections[0].workspaceId).toBeUndefined(); // Should be undefined when no workspace
      expect(collections[0].name).toBe('Test Collection');

      expect(mockShowInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Import completed')
      );
    });

    it('should handle file read errors', async () => {
      const mockOpenUri = vscode.Uri.file('/test/import.json');
      mockShowOpenDialog.mockResolvedValue([mockOpenUri]);
      mockReadFile.mockRejectedValue(new Error('File read failed'));

      await command.execute();

      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to import bookmarks')
      );
    });

    it('should assign imported collections to current workspace', async () => {
      const mockOpenUri = vscode.Uri.file('/test/import.json');
      mockShowOpenDialog.mockResolvedValue([mockOpenUri]);
      mockReadFile.mockResolvedValue(
        Buffer.from(JSON.stringify(sampleImportData))
      );
      mockShowQuickPick.mockResolvedValue({ value: 'merge' });

      jest.spyOn(storageService, 'saveBookmarks').mockResolvedValue();
      jest.spyOn(storageService, 'saveCollections').mockResolvedValue();
      jest.spyOn(treeDataProvider, 'refresh').mockImplementation();
      jest.spyOn(decorationProvider, 'updateDecorations').mockImplementation();

      await command.execute();

      // Verify that the imported collection is assigned to the current workspace
      const collections = collectionManager.getAllCollections();
      expect(collections).toHaveLength(1);
      expect(collections[0].workspaceId).toBe('file:///workspace'); // Should be current workspace
      expect(collections[0].name).toBe('Test Collection');
      expect(collections[0].id).toBe('test-collection-id');
    });
  });
});
