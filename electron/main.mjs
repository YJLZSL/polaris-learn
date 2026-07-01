import { app, BrowserWindow, shell, ipcMain, screen, safeStorage, clipboard, session } from "electron";
import fs from "node:fs";
import electronUpdater from "electron-updater";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { autoUpdater } = electronUpdater;

// Polaris 三态开发模式：vite（开发服务器）/ unpacked（解压 app.asar 调试）/ packaged（生产，默认）
const DEV_MODE = process.env.POLARIS_DEV_MODE || "packaged";

let mainWindow = null;

const isDev = DEV_MODE === "vite";

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { scaleFactor } = primaryDisplay;
  console.log("[DPI] Primary display scaleFactor:", scaleFactor);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: Math.floor(1024 * scaleFactor),
    minHeight: 768,
    title: "Polaris",
    icon: path.join(__dirname, "..", "public", "icon-512.png"),
    show: false,
    backgroundColor: "#0B0F19",
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      zoomFactor: 1.0,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' http://localhost:11434 ws://localhost:5173 http://localhost:* ws://localhost:*; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';",
        ],
      },
    });
  });

  if (DEV_MODE === "vite") {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    const indexPath = path.join(__dirname, "..", "dist", "index.html");
    if (DEV_MODE === "unpacked") {
      console.log("[Polaris] Unpacked mode: loadFile ->", indexPath);
    }
    mainWindow.loadFile(indexPath);
  }

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

ipcMain.handle("get-app-version", () => app.getVersion());
ipcMain.handle("open-external", (_event, url) => shell.openExternal(url));
ipcMain.handle("get-user-data-path", () => app.getPath("userData"));

ipcMain.handle("clipboard-read-text", () => clipboard.readText());
ipcMain.handle("clipboard-write-text", (_event, text) => clipboard.writeText(text));

let secureStorageFile = path.join(app.getPath("userData"), "polaris-secure-storage.json");

function readSecureStore() {
  try {
    return JSON.parse(fs.readFileSync(secureStorageFile, "utf8"));
  } catch {
    return {};
  }
}

function writeSecureStore(store) {
  fs.writeFileSync(secureStorageFile, JSON.stringify(store, null, 2));
}

ipcMain.handle("secure-storage-get", (_event, key) => {
  const store = readSecureStore();
  const encrypted = store[key];
  if (!encrypted) return null;
  try {
    const buffer = Buffer.from(encrypted, "base64");
    return safeStorage.decryptString(buffer);
  } catch (err) {
    console.error("[SecureStorage] decrypt failed:", err);
    return null;
  }
});

ipcMain.handle("secure-storage-set", (_event, key, value) => {
  const encrypted = safeStorage.encryptString(value).toString("base64");
  const store = readSecureStore();
  store[key] = encrypted;
  writeSecureStore(store);
});

ipcMain.handle("secure-storage-remove", (_event, key) => {
  const store = readSecureStore();
  delete store[key];
  writeSecureStore(store);
});

if (!isDev) {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on("update-available", (info) => {
    console.log("[AutoUpdater] Update available:", info.version);
    if (mainWindow) {
      mainWindow.webContents.send("update-available", { version: info.version });
    }
  });

  autoUpdater.on("update-not-available", () => {
    console.log("[AutoUpdater] App is up to date");
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log("[AutoUpdater] Update downloaded:", info.version);
    if (mainWindow) {
      mainWindow.webContents.send("update-downloaded", { version: info.version });
    }
  });

  autoUpdater.on("error", (err) => {
    console.error("[AutoUpdater] Error:", err);
  });

  ipcMain.handle("check-for-update", () => autoUpdater.checkForUpdatesAndNotify());
  ipcMain.handle("quit-and-install", () => autoUpdater.quitAndInstall());
}

app.whenReady().then(async () => {
  // 根据 DEV_MODE 对 userData 路径分桶，隔离 vite / unpacked / packaged 数据
  if (DEV_MODE === "vite") {
    app.setPath("userData", app.getPath("userData") + "-dev");
  } else if (DEV_MODE === "unpacked") {
    app.setPath("userData", app.getPath("userData") + "-staging");
  }
  // 重新计算 secureStorageFile，使其指向分桶后的 userData
  secureStorageFile = path.join(app.getPath("userData"), "polaris-secure-storage.json");

  console.log("[Polaris] Mode:", DEV_MODE, "| UserData:", app.getPath("userData"));

  createWindow();

  screen.on("display-metrics-changed", (_event, _display, changedMetrics) => {
    if (changedMetrics.includes("scaleFactor")) {
      console.log("[DPI] scaleFactor changed to", screen.getPrimaryDisplay().scaleFactor);
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

const gotSingleLock = app.requestSingleInstanceLock();
if (!gotSingleLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
