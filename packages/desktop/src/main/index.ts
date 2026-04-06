import { app, BrowserWindow, shell, nativeImage } from "electron";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { registerIpcHandlers } from "./ipc";
import { killAllSessions } from "./pty-manager";

// Single instance lock: only one Tomomo window allowed
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

function createWindow(): BrowserWindow {
  const isMac = process.platform === "darwin";
  const iconPath = is.dev
    ? join(__dirname, "../../resources/icon-macos.png")
    : join(process.resourcesPath, "icon-macos.png");

  const win = new BrowserWindow({
    icon: iconPath,
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    // macOS: native traffic lights with inset positioning
    // Windows/Linux: native controls overlay on the right
    ...(isMac
      ? {
          titleBarStyle: "hiddenInset",
          trafficLightPosition: { x: 16, y: 16 },
        }
      : {
          // Electron does not support dynamic titlebar overlay colors.
          // This matches --bg-1 in the dark theme. Light theme users will
          // see a dark titlebar strip, which is an accepted limitation.
          titleBarOverlay: {
            color: "#131319",
            symbolColor: "#9d9db5",
            height: 48,
          },
        }),
    backgroundColor: "#0c0c12",
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.on("ready-to-show", () => {
    win.show();
  });

  // Uncomment to open devtools in dev mode
  // if (is.dev) {
  //   win.webContents.openDevTools({ mode: "detach" });
  // }

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return win;
}

// Fix PATH for macOS GUI apps (Electron doesn't inherit shell PATH)
if (process.platform === "darwin") {
  try {
    const userShell = process.env.SHELL || "/bin/zsh";
    const shellPath = execFileSync(userShell, ["-l", "-i", "-c", "echo $PATH"], {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (shellPath) {
      process.env.PATH = shellPath;
    }
  } catch {
    // Shell PATH fix failed, continue with default PATH
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId("app.tomomo.desktop");

  // Set dock icon on macOS (BrowserWindow.icon is ignored on macOS)
  // Use the pre-rounded version so it looks correct in dev mode
  if (process.platform === "darwin" && app.dock) {
    const dockIconPath = is.dev
      ? join(__dirname, "../../resources/icon-macos.png")
      : join(process.resourcesPath, "icon-macos.png");
    app.dock.setIcon(nativeImage.createFromPath(dockIconPath));
  }

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Focus existing window when second instance is attempted
app.on("second-instance", () => {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on("before-quit", () => {
  killAllSessions();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
