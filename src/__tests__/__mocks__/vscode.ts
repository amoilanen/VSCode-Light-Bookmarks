export const window = {
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  showQuickPick: jest.fn(),
  showSaveDialog: jest.fn(),
  showOpenDialog: jest.fn(),
  activeTextEditor: null,
  onDidChangeActiveTextEditor: jest.fn(),
  createTreeView: jest.fn(),
  createTextEditorDecorationType: jest.fn().mockReturnValue({
    dispose: jest.fn(),
  }),
};

export const workspace = {
  onDidChangeTextDocument: jest.fn(),
  getConfiguration: jest.fn().mockReturnValue({
    get: jest.fn().mockImplementation((key: string, defaultValue: any) => {
      if (key === 'showLineNumbers') return true;
      if (key === 'maxBookmarksPerFile') return 100;
      return defaultValue;
    }),
  }),
  workspaceFolders: [
    {
      uri: {
        scheme: 'file',
        authority: '',
        path: '/workspace',
        fsPath: '/workspace', // Add fsPath for tests
        toString: () => 'file:///workspace',
      },
    },
  ],
  openTextDocument: jest.fn(),
  fs: {
    writeFile: jest.fn(),
    readFile: jest.fn(),
    stat: jest.fn(),
  },
};

export const commands = {
  registerCommand: jest.fn(),
  executeCommand: jest.fn(),
};

export const extensions = {
  getExtension: jest.fn().mockReturnValue({
    extensionPath: '/mock/extension/path',
    extensionUri: {
      path: '/mock/extension/path',
      toString: () => '/mock/extension/path',
    },
  }),
};

export const Uri = {
  parse: jest.fn((uri: string) => {
    // Simple URI parsing for test purposes
    const url = new URL(uri);
    return {
      scheme: url.protocol.slice(0, -1), // Remove the ':' at the end
      authority: url.hostname,
      path: url.pathname,
      fsPath: url.pathname, // Add fsPath for tests
      toString: () => uri,
    };
  }),
  file: jest.fn((path: string) => ({
    path,
    fsPath: path, // Add fsPath for tests
    toString: () => `file://${path}`,
  })),
  joinPath: jest.fn((baseUri: any, ...paths: string[]) => ({
    path: `${baseUri.path || baseUri}/${paths.join('/')}`,
    fsPath: `${baseUri.path || baseUri}/${paths.join('/')}`, // Add fsPath for tests
    toString: () => `${baseUri.toString()}/${paths.join('/')}`,
  })),
};

export const Range = jest.fn();

export const TreeItemCollapsibleState = {
  None: 0,
  Collapsed: 1,
  Expanded: 2,
};

export const ThemeIcon = jest.fn();

export const EventEmitter = jest.fn().mockImplementation(() => ({
  fire: jest.fn(),
  event: jest.fn(),
}));

export const Disposable = {
  from: jest.fn(),
};

export class TreeItem {
  constructor(
    public label: string,
    public collapsibleState: any,
    public bookmark?: any,
    public collection?: any
  ) {}
}

export class MarkdownString {
  constructor(public value: string) {}
  isTrusted = false;
}
