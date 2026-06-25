// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge, ipcRenderer } = require("electron");

// ---------------------------------------------------------------------------
// Expose a safe, minimal API to the renderer process.
// The renderer can access these via `window.electronAPI`.
// ---------------------------------------------------------------------------

contextBridge.exposeInMainWorld("electronAPI", {
  /**
   * Detect whether the app is running inside Electron.
   */
  isElectron: true,

  /**
   * Get the current platform (win32, darwin, linux).
   */
  platform: process.platform,

  /**
   * Get app version from package.json.
   */
  getVersion: () => ipcRenderer.invoke("get-app-version"),

  /**
   * Open an external URL in the default browser.
   */
  openExternal: (url) => ipcRenderer.invoke("open-external", url),

  /**
   * Get the path to the app's user data directory.
   */
  getUserDataPath: () => ipcRenderer.invoke("get-user-data-path"),

  /**
   * Listen for a message from the main process.
   */
  on: (channel, callback) => {
    const validChannels = ["app-version", "deep-link"];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  },

  /**
   * Remove a listener.
   */
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  /**
   * Listen for an available update notification from the main process.
   */
  onUpdateAvailable: (callback) => {
    ipcRenderer.on("update-available", (_event, data) => callback(data));
  },

  /**
   * Listen for a downloaded update notification from the main process.
   */
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on("update-downloaded", (_event, data) => callback(data));
  },

  /**
   * Trigger installation of a downloaded update (quits and installs).
   */
  installUpdate: () => ipcRenderer.invoke("install-update"),
});
