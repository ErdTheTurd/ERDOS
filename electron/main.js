const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const isDev = process.argv.includes('--dev');
let mainWindow = null;
let userDataRoot = null;

function getHomeRoot() {
  if (!userDataRoot) {
    userDataRoot = path.join(app.getPath('userData'), 'ErdOSHome');
  }
  return userDataRoot;
}

function progressPath() {
  return path.join(getHomeRoot(), 'Apps', 'progress.json');
}

function ensureHome() {
  const root = getHomeRoot();
  const dirs = ['Desktop', 'Documents', 'Downloads', 'Pictures', 'Apps', 'Notes'];
  for (const dir of dirs) {
    const full = path.join(root, dir);
    if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
  }
  const welcome = path.join(root, 'Desktop', 'Welcome to ErdOS.txt');
  if (!fs.existsSync(welcome)) {
    fs.writeFileSync(
      welcome,
      'Welcome to ErdOS!\n\nOpen the Start menu to launch apps.\nTry ERDAI (Puter AI), the Browser, Arcade, and Terminal.\n',
      'utf8'
    );
  }
  if (!fs.existsSync(progressPath())) {
    fs.writeFileSync(progressPath(), JSON.stringify(defaultProgress(), null, 2), 'utf8');
  }
}

function defaultProgress() {
  return {
    version: 2,
    displayName: '',
    muted: false,
    wallpaper: 'phosphor-grid',
    unlockedWallpapers: ['phosphor-grid', 'deep-scan', 'crt-dawn', 'signal-bloom', 'midnight-beam'],
    unlockedThemes: ['', 'theme-ember', 'theme-violet-night', 'theme-forest'],
    pinnedApps: ['browser', 'erdai', 'games', 'terminal'],
    iconLayout: {},
    highScores: { snake: 0, breakout: 0, memory: 0, pong: 0 },
    erdaiMemory: { facts: [] },
  };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: 'ErdOS',
    backgroundColor: '#030d14',
    show: false,
    // Normal app window — never kiosk / never replaces the host OS
    fullscreen: false,
    simpleFullscreen: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      sandbox: false,
    },
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile(path.join(__dirname, '..', 'desktop', 'index.html'));

  // Puter AI auth / popups
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const host = new URL(url).hostname;
      if (host === 'puter.com' || host.endsWith('.puter.com') || host === 'js.puter.com') {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            width: 520,
            height: 720,
            autoHideMenuBar: true,
            webPreferences: {
              contextIsolation: true,
              nodeIntegration: false,
              sandbox: true,
            },
          },
        };
      }
    } catch (_) { /* fall through */ }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
    setupAutoUpdater();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupAutoUpdater() {
  if (isDev) return;
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = false;
    autoUpdater.on('update-available', (info) => {
      mainWindow?.webContents.send('erdos:update-status', {
        status: 'available',
        version: info.version,
      });
    });
    autoUpdater.on('update-not-available', () => {
      mainWindow?.webContents.send('erdos:update-status', { status: 'current' });
    });
    autoUpdater.on('error', (err) => {
      mainWindow?.webContents.send('erdos:update-status', {
        status: 'error',
        message: String(err?.message || err),
      });
    });
    autoUpdater.on('download-progress', (p) => {
      mainWindow?.webContents.send('erdos:update-status', {
        status: 'downloading',
        percent: p.percent,
      });
    });
    autoUpdater.on('update-downloaded', () => {
      mainWindow?.webContents.send('erdos:update-status', { status: 'ready' });
    });
    autoUpdater.checkForUpdates().catch(() => {});
  } catch {
    // electron-updater optional in unpackaged runs
  }
}

app.whenReady().then(() => {
  ensureHome();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('erdos:get-system-info', () => ({
  platform: process.platform,
  arch: process.arch,
  version: app.getVersion(),
  hostname: os.hostname(),
  home: getHomeRoot(),
  cpus: os.cpus().length,
  memoryGB: Math.round(os.totalmem() / (1024 ** 3)),
  freememGB: Math.round(os.freemem() / (1024 ** 3)),
  uptime: Math.floor(os.uptime()),
  isPackaged: app.isPackaged,
}));

ipcMain.handle('erdos:get-progress', async () => {
  try {
    const raw = await fs.promises.readFile(progressPath(), 'utf8');
    return { ...defaultProgress(), ...JSON.parse(raw) };
  } catch {
    const data = defaultProgress();
    await fs.promises.writeFile(progressPath(), JSON.stringify(data, null, 2), 'utf8');
    return data;
  }
});

ipcMain.handle('erdos:set-progress', async (_e, data) => {
  const merged = { ...defaultProgress(), ...data };
  await fs.promises.mkdir(path.dirname(progressPath()), { recursive: true });
  await fs.promises.writeFile(progressPath(), JSON.stringify(merged, null, 2), 'utf8');
  return merged;
});

ipcMain.handle('erdos:list-dir', async (_e, targetPath) => {
  const resolved = resolveSafe(targetPath || getHomeRoot());
  const entries = await fs.promises.readdir(resolved, { withFileTypes: true });
  return {
    path: resolved,
    entries: entries
      .map((d) => ({
        name: d.name,
        isDirectory: d.isDirectory(),
        isFile: d.isFile(),
      }))
      .sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
  };
});

ipcMain.handle('erdos:read-file', async (_e, targetPath) => {
  const resolved = resolveSafe(targetPath);
  const stat = await fs.promises.stat(resolved);
  if (stat.size > 2 * 1024 * 1024) throw new Error('File too large');
  return fs.promises.readFile(resolved, 'utf8');
});

ipcMain.handle('erdos:write-file', async (_e, targetPath, content) => {
  const resolved = resolveSafe(targetPath);
  await fs.promises.mkdir(path.dirname(resolved), { recursive: true });
  await fs.promises.writeFile(resolved, content ?? '', 'utf8');
  return { ok: true, path: resolved };
});

ipcMain.handle('erdos:create-folder', async (_e, targetPath) => {
  const resolved = resolveSafe(targetPath);
  await fs.promises.mkdir(resolved, { recursive: true });
  return { ok: true, path: resolved };
});

ipcMain.handle('erdos:delete-path', async (_e, targetPath) => {
  const resolved = resolveSafe(targetPath);
  if (resolved === getHomeRoot()) throw new Error('Cannot delete ErdOS home');
  await fs.promises.rm(resolved, { recursive: true, force: true });
  return { ok: true };
});

ipcMain.handle('erdos:open-external', async (_e, url) => {
  if (typeof url !== 'string') return;
  await shell.openExternal(url);
});

ipcMain.handle('erdos:pick-save-path', async (_e, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: path.join(getHomeRoot(), 'Documents', defaultName || 'untitled.txt'),
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle('erdos:pick-open-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    defaultPath: path.join(getHomeRoot(), 'Documents'),
    properties: ['openFile'],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('erdos:check-updates', async () => {
  if (isDev || !app.isPackaged) return { status: 'dev' };
  try {
    const { autoUpdater } = require('electron-updater');
    const result = await autoUpdater.checkForUpdates();
    return { status: 'checked', version: result?.updateInfo?.version };
  } catch (err) {
    return { status: 'error', message: String(err?.message || err) };
  }
});

ipcMain.handle('erdos:download-update', async () => {
  try {
    const { autoUpdater } = require('electron-updater');
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: String(err?.message || err) };
  }
});

ipcMain.handle('erdos:install-update', () => {
  const { autoUpdater } = require('electron-updater');
  autoUpdater.quitAndInstall();
});

function resolveSafe(targetPath) {
  const resolved = path.resolve(targetPath || getHomeRoot());
  const root = path.resolve(getHomeRoot());
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    const home = path.resolve(os.homedir());
    if (resolved !== home && !resolved.startsWith(home + path.sep)) {
      throw new Error('Access denied outside home directories');
    }
  }
  return resolved;
}
