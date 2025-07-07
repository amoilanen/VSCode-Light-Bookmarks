import * as vscode from 'vscode';

const DEFAULT_LOCALE = 'en';

export class LocalizationService {
  private bundle: { [key: string]: string };

  public constructor() {
    this.bundle = {};
  }

  public initialize() {
    this.bundle = this.loadBundle();
  }

  private loadBundle(): { [key: string]: string } {
    const locale = vscode.env?.language || DEFAULT_LOCALE;
    return require(`../localization/bundle.${locale}.json`);
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

let service: LocalizationService;

export function getService(): LocalizationService {
  if (!service) {
    service = new LocalizationService();
    try {
      service.initialize();
    } catch (error) {
      console.error('Failed to initialize localization service:', error);
    }
  }
  return service;
}

export function localize(key: string, ...args: string[]): string {
  return getService().localize(key, ...args);
}
