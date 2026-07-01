/**
 * Type declarations for the Electron preload API exposed via contextBridge.
 * When not running in Electron, `window.electronAPI` is undefined.
 */
interface ElectronAPI {
  /** Always `true` when running inside Electron. */
  isElectron: boolean;

  /** The OS platform: "win32" | "darwin" | "linux". */
  platform: NodeJS.Platform;

  /** Resolve the current app version (from package.json). */
  getVersion: () => Promise<string>;

  /** Open a URL in the default system browser. */
  openExternal: (url: string) => Promise<void>;

  /** Get the path to Electron's user-data directory. */
  getUserDataPath: () => Promise<string>;

  /** Secure storage: get an encrypted value by key. */
  secureStorageGet: (key: string) => Promise<string | null>;

  /** Secure storage: store an encrypted value by key. */
  secureStorageSet: (key: string, value: string) => Promise<void>;

  /** Secure storage: remove an encrypted value by key. */
  secureStorageRemove: (key: string) => Promise<void>;

  /** Clipboard: read text. */
  clipboardReadText: () => Promise<string>;

  /** Clipboard: write text. */
  clipboardWriteText: (text: string) => Promise<void>;

  /** Check for an available application update. */
  checkForUpdate: () => Promise<{ updateAvailable: boolean; version?: string; releaseNotes?: string }>;

  /** Quit the app and install a downloaded update. */
  quitAndInstall: () => Promise<void>;

  /** Subscribe to update available notifications. */
  onUpdateAvailable: (callback: (data: { version: string }) => void) => void;

  /** Subscribe to update downloaded notifications. */
  onUpdateDownloaded: (callback: (data: { version: string }) => void) => void;

  /** Remove update event listeners for a channel. */
  removeUpdateListeners: (channel: string) => void;

  /** Subscribe to a message from the main process. */
  on: (channel: "app-version" | "deep-link", callback: (...args: unknown[]) => void) => void;

  /** Unsubscribe from a channel. */
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
