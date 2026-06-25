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
