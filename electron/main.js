// eslint-disable-next-line @typescript-eslint/no-require-imports
const { app, BrowserWindow, shell, ipcMain, screen } = require("electron");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { autoUpdater } = require("electron-updater");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const serve = require("electron-serve");

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let mainWindow = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const isDev = !app.isPackaged;
const loadURL = serve({ directory: "out" });

// ---------------------------------------------------------------------------
// Window creation
// ---------------------------------------------------------------------------
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
    show: false, // show after ready-to-show to avoid white flash
    backgroundColor: "#f8fafc",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // required for preload to use Node.js APIs
      zoomFactor: 1.0, // 默认 1.0，Electron 自动处理 DPI
    },
  });

  // Gracefully show window when content is ready
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Open external links in the default browser instead of Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  // Load the Next.js app
  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    loadURL(mainWindow);
  }

  // Open DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

// ---------------------------------------------------------------------------
// IPC handlers (must be registered before app.whenReady)
// ---------------------------------------------------------------------------
ipcMain.handle("get-app-version", () => app.getVersion());
ipcMain.handle("open-external", (_event, url) => shell.openExternal(url));
ipcMain.handle("get-user-data-path", () => app.getPath("userData"));

// ---------------------------------------------------------------------------
// Auto-updater (electron-updater via GitHub Releases)
// ---------------------------------------------------------------------------
// 只在打包后启用自动更新 (开发模式下 autoUpdater 会报错)
if (!isDev) {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false; // 等待用户确认

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

  // 暴露给渲染进程:触发安装更新
  ipcMain.handle("install-update", () => {
    autoUpdater.quitAndInstall();
  });
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
app.whenReady().then(async () => {
  createWindow();

  // 监听 DPI 变化（仅记录日志，不强制调整 zoom，Electron 自动处理 DPI）
  screen.on("display-metrics-changed", (_event, _display, changedMetrics) => {
    if (changedMetrics.includes("scaleFactor")) {
      console.log("[DPI] scaleFactor changed to", screen.getPrimaryDisplay().scaleFactor);
    }
  });

  // macOS: re-create window when dock icon clicked and no windows exist
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  // On macOS, apps typically stay active until Cmd+Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Prevent multiple instances (optional but recommended)
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
