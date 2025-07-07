import * as vscode from 'vscode';

export class LocalizationService {
  private static instance: LocalizationService;
  private bundle: { [key: string]: string };

  private constructor() {
    this.bundle = this.loadBundle();
  }

  public static getInstance(): LocalizationService {
    if (!LocalizationService.instance) {
      LocalizationService.instance = new LocalizationService();
    }
    return LocalizationService.instance;
  }

  private loadBundle(): { [key: string]: string } {
    // Get the current locale
    const locale = vscode.env?.language;

    // If no locale is available (e.g., in test environment), use default bundle
    if (!locale) {
      return this.getDefaultBundle();
    }

    // Try to load the appropriate bundle based on locale
    try {
      switch (locale) {
        case 'de':
          return require('../localization/bundle.de.json');
        case 'nl':
          return require('../localization/bundle.nl.json');
        case 'fr':
          return require('../localization/bundle.fr.json');
        default:
          return this.getDefaultBundle();
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        `Failed to load localized bundle for locale ${locale}:`,
        error
      );
      return this.getDefaultBundle();
    }
  }

  private getDefaultBundle(): { [key: string]: string } {
    return {
      // Messages
      'message.noActiveEditor': 'No active editor found',
      'message.noBookmarksFound': 'No bookmarks found',
      'message.noBookmarkAtLocation':
        'No bookmark found at the specified location.',
      'message.noBookmarkAtCurrentLine':
        'No bookmark found at current line. Please add a bookmark first.',
      'message.bookmarkAlreadyExists':
        'A bookmark already exists at this location.',
      'message.bookmarkAdded': 'Bookmark added successfully',
      'message.bookmarkRemoved': 'Bookmark removed successfully',
      'message.bookmarkUpdated': 'Bookmark updated successfully',
      'message.collectionCreated': 'Collection created successfully',
      'message.collectionDeleted': 'Collection deleted successfully',
      'message.collectionAlreadyExists':
        'A collection with this name already exists in this workspace',
      'message.collectionNotFound': 'Collection not found',
      'message.noCollectionsAvailable':
        'No collections available. Please create a collection first.',
      'message.noOtherCollectionsAvailable':
        'No other collections available. Please create a collection first.',
      'message.maxBookmarksReached':
        'Cannot add bookmark: Maximum of {0} bookmarks per file reached. Please remove some bookmarks first.',
      'message.bookmarkAtTop':
        'Bookmark is already at the top or cannot be moved',
      'message.bookmarkAtBottom':
        'Bookmark is already at the bottom or cannot be moved',
      'message.collectionAtTop':
        'Collection is already at the top or cannot be moved',
      'message.collectionAtBottom':
        'Collection is already at the bottom or cannot be moved',
      'message.failedToCreateCollection': 'Failed to create collection',
      'message.failedToDeleteCollection': 'Failed to delete collection',
      'message.failedToDeleteBookmark': 'Failed to delete bookmark',
      'message.failedToUpdateBookmark': 'Failed to update bookmark description',
      'message.failedToOpenBookmark': 'Failed to open bookmark: {0}',
      'message.failedToExportBookmarks': 'Failed to export bookmarks: {0}',
      'message.failedToImportBookmarks': 'Failed to import bookmarks: {0}',
      'message.invalidJSONFile': 'Invalid JSON file format',
      'message.invalidBookmarkExportFile':
        'Invalid bookmark export file format',
      'message.bookmarksExportedSuccessfully':
        'Bookmarks exported successfully to {0}',
      'message.importCompleted': 'Import completed! {0}',
      'message.wrappedToFirstBookmark': 'Wrapped to first bookmark',
      'message.wrappedToLastBookmark': 'Wrapped to last bookmark',
      'message.failedToInitializeExtension':
        'Failed to initialize Light Bookmarks extension',

      // Prompts
      'prompt.createCollection': 'Create New Collection',
      'prompt.enterCollectionName': 'Enter collection name',
      'prompt.enterCollectionNamePlaceholder':
        'Please enter a name for the new collection',
      'prompt.editBookmarkDescription': 'Edit Bookmark Description',
      'prompt.enterBookmarkDescription': 'Enter bookmark description',
      'prompt.enterBookmarkDescriptionPlaceholder':
        'Please enter a description for this bookmark',
      'prompt.selectCollection': 'Select a collection to add the bookmark to',
      'prompt.chooseImportOption': 'Choose how to import bookmarks',
      'prompt.importOptions': 'Import Options',

      // Validation messages
      'validation.collectionNameEmpty': 'Collection name cannot be empty',
      'validation.descriptionTooLong':
        'Description cannot exceed 500 characters',

      // Confirmation messages
      'confirm.deleteCollection':
        'Deleting collection will also delete bookmarks contained in it, proceed?',
      'confirm.deleteUngroupedCollection':
        'Deleting the "Ungrouped" collection will delete all ungrouped bookmarks. This action cannot be undone. Proceed?',
      'confirm.delete': 'Delete',

      // Import options
      'import.replaceAll': 'Replace all bookmarks',
      'import.replaceAllDescription':
        'Remove all existing bookmarks and collections, then import',
      'import.merge': 'Merge with existing bookmarks',
      'import.mergeDescription':
        'Add imported bookmarks to existing ones (duplicates may occur)',

      // Success messages
      'success.importedBookmarks':
        'Imported {0} bookmarks and {1} collections.',
      'success.addedBookmarks':
        'Added {0} new bookmarks and {1} new collections.',

      // Actions
      'action.openFile': 'Open File',

      // Labels
      'label.ungrouped': 'Ungrouped',
      'label.line': 'Line',
      'label.unknown': 'Unknown',
      'label.unableToReadCodeLine': 'Unable to read code line',
      'label.noBookmarks': 'No bookmarks',
      'label.addFirstBookmark': 'Add first bookmark in file editor',
      'label.addFirstBookmarkTooltip':
        'No bookmarks added yet\n\nAdd first bookmark with Ctrl+Alt+K in file editor',

      // Tooltips
      'tooltip.clickToOpen': 'Click to open',
      'tooltip.clickToExpand': 'Click to expand',
      'tooltip.openBookmark': 'Open Bookmark',
      'tooltip.lineNumber': 'Line {0}: {1}',
      'tooltip.bookmarkLocation': '{0}:{1}',
      'tooltip.bookmarkWithDescription':
        '{0}:{1}\n\n**Description:** {2}\n\n**Click to open**',
      'tooltip.collectionName': '{0}\n\n**Click to expand**',
    };
  }

  public localize(key: string, ...args: string[]): string {
    const message = this.bundle[key] || key;

    if (args.length === 0) {
      return message;
    }

    // Simple placeholder replacement: {0}, {1}, etc.
    return message.replace(/\{(\d+)\}/g, (match, index) => {
      const argIndex = parseInt(index);
      return args[argIndex] !== undefined ? args[argIndex] : match;
    });
  }

  public reloadBundle(): void {
    this.bundle = this.loadBundle();
  }
}

// Convenience function for easy access
export function localize(key: string, ...args: string[]): string {
  return LocalizationService.getInstance().localize(key, ...args);
}
