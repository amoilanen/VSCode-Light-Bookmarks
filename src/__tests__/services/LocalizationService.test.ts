import { LocalizationService } from '../../services/LocalizationService';
import * as vscode from 'vscode';

const mockBundleEn = {
  welcome: 'Hello {0}!',
  'bookmark.added': 'Bookmark added to {0}',
  simple: 'Simple message',
  missing: undefined,
};

const mockBundleDe = {
  welcome: 'Hallo {0}!',
  'bookmark.added': 'Lesezeichen zu {0} hinzugefügt',
  simple: 'Einfache Nachricht',
  missing: undefined,
};

jest.mock('../../localization/bundle.en.json', () => mockBundleEn, {
  virtual: true,
});
jest.mock('../../localization/bundle.de.json', () => mockBundleDe, {
  virtual: true,
});

describe('LocalizationService', () => {
  let service: LocalizationService;
  let mockVscodeEnv: { language?: string };

  beforeEach(() => {
    jest.resetModules();
    mockVscodeEnv = { language: 'en' };
    (vscode.env as any) = mockVscodeEnv;
    service = new LocalizationService();
  });

  describe('bundle loading', () => {
    it('should load English bundle on initialize', () => {
      mockVscodeEnv.language = 'en';
      service.initialize();
      expect(service.localize('welcome', 'John')).toBe('Hello John!');
    });

    it('should load German bundle on initialize', () => {
      mockVscodeEnv.language = 'de';
      service.initialize();
      expect(service.localize('welcome', 'John')).toBe('Hallo John!');
    });

    it('should reload bundle when called', () => {
      mockVscodeEnv.language = 'en';
      service.initialize();
      expect(service.localize('simple')).toBe('Simple message');
      mockVscodeEnv.language = 'de';
      service.reloadBundle();
      expect(service.localize('simple')).toBe('Einfache Nachricht');
    });
  });

  describe('template replacement', () => {
    beforeEach(() => {
      service.initialize();
    });

    it('should replace single placeholder in English', () => {
      mockVscodeEnv.language = 'en';
      service.initialize();
      const result = service.localize('welcome', 'John');
      expect(result).toBe('Hello John!');
    });

    it('should replace single placeholder in German', () => {
      mockVscodeEnv.language = 'de';
      service.initialize();
      const result = service.localize('welcome', 'John');
      expect(result).toBe('Hallo John!');
    });

    it('should replace multiple placeholders', () => {
      mockVscodeEnv.language = 'en';
      service.initialize();
      const result = service.localize('bookmark.added', 'project');
      expect(result).toBe('Bookmark added to project');
    });

    it('should return key when message not found', () => {
      const result = service.localize('nonexistent.key');
      expect(result).toBe('nonexistent.key');
    });

    it('should return message unchanged when no placeholders', () => {
      mockVscodeEnv.language = 'en';
      service.initialize();
      const result = service.localize('simple');
      expect(result).toBe('Simple message');
    });
  });
});
