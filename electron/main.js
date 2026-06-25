// eslint-disable-next-line @typescript-eslint/no-require-imports
const { app, BrowserWindow, shell, ipcMain } = require("electron");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { spawn } = require("child_process");

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let mainWindow = null;
let nextServer = null;
const NEXT_PORT = 3000;
const NEXT_URL = `http://localhost:${NEXT_PORT}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const isDev = !app.isPackaged;

/**
 * In production mode, start the Next.js server as a child process.
 * In development mode, the server is started externally by concurrently.
 */
function startNextServer() {
  if (isDev) return Promise.resolve();

  return new Promise((resolve, reject) => {
    // Resolve the local next binary installed in node_modules
    const nextBin = path.join(
      __dirname,
      "..",
      "node_modules",
      ".bin",
      process.platform === "win32" ? "next.cmd" : "next"
    );

    nextServer = spawn(nextBin, ["start", "--port", String(NEXT_PORT)], {
      cwd: path.join(__dirname, ".."),
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NODE_ENV: "production" },
    });

    let started = false;

    const onData = (data) => {
      const text = data.toString();
      // Next.js prints "Ready" or "started server" when it's ready
      if (!started && (text.includes("Ready") || text.includes("ready"))) {
        started = true;
        resolve();
      }
    };

    nextServer.stdout.on("data", onData);
    nextServer.stderr.on("data", onData);

    nextServer.on("error", (err) => {
      if (!started) reject(err);
    });

    nextServer.on("close", (code) => {
      if (!started) {
        reject(new Error(`Next.js server exited with code ${code}`));
      }
    });

    // Safety timeout: if the server doesn't report ready within 30s, proceed anyway
    setTimeout(() => {
      if (!started) {
        started = true;
        resolve();
      }
    }, 30_000);
  });
}

// ---------------------------------------------------------------------------
// Window creation
// ---------------------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: "智学AI教育平台",
    show: false, // show after ready-to-show to avoid white flash
    backgroundColor: "#f8fafc",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // required for preload to use Node.js APIs
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
  mainWindow.loadURL(NEXT_URL);

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
  try {
    await startNextServer();
  } catch (err) {
    console.error("Failed to start Next.js server:", err);
  }

  createWindow();

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

app.on("before-quit", () => {
  // Clean up the Next.js child process
  if (nextServer && !nextServer.killed) {
    nextServer.kill("SIGTERM");
    nextServer = null;
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
