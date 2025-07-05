export const window = {
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  showQuickPick: jest.fn(),
  activeTextEditor: null,
  onDidChangeActiveTextEditor: jest.fn(),
  createTreeView: jest.fn()
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
      uri: { scheme: 'file', authority: '', path: '/workspace' },
    },
  ],
  openTextDocument: jest.fn(),
};

export const commands = {
  registerCommand: jest.fn()
};

export const Uri = {
  parse: jest.fn((uri: string) => ({ path: uri, toString: () => uri }))
};

export const Range = jest.fn();

export const TreeItemCollapsibleState = {
  None: 0,
  Collapsed: 1,
  Expanded: 2
};

export const ThemeIcon = jest.fn();

export const EventEmitter = jest.fn().mockImplementation(() => ({
  fire: jest.fn(),
  event: jest.fn()
}));

export const Disposable = {
  from: jest.fn()
}; 