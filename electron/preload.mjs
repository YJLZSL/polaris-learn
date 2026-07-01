import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  platform: process.platform,

  getVersion: () => ipcRenderer.invoke("get-app-version"),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  getUserDataPath: () => ipcRenderer.invoke("get-user-data-path"),

  secureStorageGet: (key) => ipcRenderer.invoke("secure-storage-get", key),
  secureStorageSet: (key, value) => ipcRenderer.invoke("secure-storage-set", key, value),
  secureStorageRemove: (key) => ipcRenderer.invoke("secure-storage-remove", key),

  clipboardReadText: () => ipcRenderer.invoke("clipboard-read-text"),
  clipboardWriteText: (text) => ipcRenderer.invoke("clipboard-write-text", text),

  checkForUpdate: () => ipcRenderer.invoke("check-for-update"),
  quitAndInstall: () => ipcRenderer.invoke("quit-and-install"),

  onUpdateAvailable: (callback) => {
    ipcRenderer.on("update-available", (_event, data) => callback(data));
  },

  onUpdateDownloaded: (callback) => {
    ipcRenderer.on("update-downloaded", (_event, data) => callback(data));
  },

  removeUpdateListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  on: (channel, callback) => {
    const validChannels = ["app-version", "deep-link"];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  },

  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
});
