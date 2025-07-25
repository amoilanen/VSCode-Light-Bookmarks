# Light Bookmarks - VSCode Extension

A lightweight bookmark manager for VSCode with collections support, built with TypeScript following Test-Driven Development principles.

## Supporting development

If you like the extension and want to support its development

<div id="donate-button-container">
<div id="donate-button"></div>
<script src="https://www.paypalobjects.com/donate/sdk/donate-sdk.js" charset="UTF-8"></script>
<script>
PayPal.Donation.Button({
env:'production',
hosted_button_id:'KE797MH5P5ECJ',
image: {
src:'https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif',
alt:'Donate with PayPal button',
title:'PayPal - The safer, easier way to pay online!',
}
}).render('#donate-button');
</script>
</div>

Code contributions are welcome and the extension will always remain open source under the LGPL v2.1 license

## Features

### Core Features
- **Bookmark Toggling**: Add or remove bookmarks on specific lines using:
  - Keyboard shortcut: `Ctrl + Alt + K`
  - Context menu item
  - Command palette action
- **Persistence**: Bookmarks persist across VSCode sessions
- **Bookmark Panel**: Dedicated view listing all active bookmarks
- **Navigation**: Click bookmarks to open files and scroll to bookmarked lines
- **Custom Icons**: Intuitive UI with custom bookmark icons

### Collections
- **Grouping**: Organize bookmarks into collections
- **Organization**: 
  - Bookmarks can belong to at most one collection
  - Some bookmarks may remain ungrouped
  - Easy addition/removal from collections
- **Visibility**: Each collection can be individually hidden or made visible

## Installation

### From Source
1. Clone this repository
2. Install dependencies:
   ```bash
   npm install<form action="https://www.paypal.com/donate" method="post" target="_top">
<input type="hidden" name="hosted_button_id" value="KE797MH5P5ECJ" />
<input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif" border="0" name="submit" title="PayPal - The safer, easier way to pay online!" alt="Donate with PayPal button" />
<img alt="" border="0" src="https://www.paypal.com/en_FI/i/scr/pixel.gif" width="1" height="1" />
</form>

   ```
3. Compile the extension:
   ```bash
   npm run compile
   ```
4. Press `F5` in VSCode to run the extension in a new Extension Development Host window

### Building for Distribution
```bash
npm run compile
npm run package
```

## Usage

### Basic Bookmark Operations
1. **Add/Remove Bookmark**: 
   - Place cursor on desired line
   - Press `Ctrl + Alt + K` or use context menu
   - Bookmark will be added/removed with visual feedback

2. **View Bookmarks**:
   - Open the Bookmarks panel in the sidebar
   - Click on any bookmark to navigate to that location

### Collections Management
1. **Create Collection**:
   - Use command palette: `Light Bookmarks: Create Collection`
   - Enter collection name

2. **Add Bookmark to Collection**:
   - Right-click on a bookmarked line
   - Select "Add to Collection"
   - Choose from available collections

3. **Manage Collections**:
   - Toggle collection visibility
   - Delete collections (with options to delete or ungroup bookmarks)

### Keyboard Shortcuts
- `Ctrl + Alt + K`: Toggle bookmark at current line

### Commands Available
- `Light Bookmarks: Toggle Bookmark`
- `Light Bookmarks: Add to Collection`
- `Light Bookmarks: Create Collection`
- `Light Bookmarks: Delete Collection`
- `Light Bookmarks: Toggle Collection Visibility`

## Development

### Project Structure
```
src/
├── models/           # Domain models (Bookmark, Collection)
├── services/         # Business logic services
├── providers/        # VSCode tree data providers
├── commands/         # Command implementations
├── utils/           # Utility functions
└── __tests__/       # Unit tests
```

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Code Quality
```bash
# Lint code
npm run lint

# Compile TypeScript
npm run compile
```

### Architecture

The extension follows clean architecture principles with clear separation of concerns:

- **Models**: Pure domain objects (Bookmark, Collection)
- **Services**: Business logic (BookmarkManager, CollectionManager, StorageService)
- **Commands**: User action handlers
- **Providers**: VSCode UI integration
- **Tests**: Comprehensive unit tests following TDD

### Key Design Patterns

1. **Dependency Injection**: Services are injected into commands and providers
2. **Event-Driven**: Tree view updates via event emitters
3. **Repository Pattern**: Storage service abstracts persistence
4. **Command Pattern**: Each user action is encapsulated in a command class

## Configuration

The extension supports the following configuration options:

- `lightBookmarks.maxBookmarks`: Maximum number of bookmarks allowed (default: 1000)
- `lightBookmarks.showLineNumbers`: Show line numbers in bookmark list (default: true)
- `lightBookmarks.autoSave`: Automatically save bookmarks (default: true)

## Localization

The extension supports many languages officially supported by VS Code and automatically detects your VSCode language setting.

### Adding New Languages

To add support for a new language:

1. Create a new file `package.nls.{locale}.json` in the root directory for package.json localization
2. Create a new file `src/localization/bundle.{locale}.json` for runtime string localization
3. Update the `LocalizationService.ts` to include the new locale

Example for Spanish (es):
```json
// package.nls.es.json
{
  "extension.displayName": "Marcadores Ligeros",
  "extension.description": "Un gestor de marcadores ligero para VSCode con soporte de colecciones",
  // ... other strings
}
```

```json
// src/localization/bundle.es.json
{
  "message.noActiveEditor": "No se encontró ningún editor activo",
  "message.noBookmarksFound": "No se encontraron marcadores",
  // ... other runtime strings
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests first (TDD approach)
4. Implement the feature
5. Ensure all tests pass
6. Submit a pull request

## Testing Strategy

The extension follows Test-Driven Development (TDD) principles:

1. **Unit Tests**: All models and services have comprehensive unit tests
2. **Integration Tests**: Commands and providers are tested with mocked dependencies
3. **Test Coverage**: Aim for >90% code coverage
4. **Test Organization**: Tests mirror the source code structure

## License

MIT License - see LICENSE file for details.

## Changelog

### v0.1.0
- Initial release
- Basic bookmark functionality
- Collections support
- Persistence across sessions
- Tree view integration 