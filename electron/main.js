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

function ensureHome() {
  const root = getHomeRoot();
  const dirs = ['Desktop', 'Documents', 'Downloads', 'Pictures', 'Apps'];
  for (const dir of dirs) {
    const full = path.join(root, dir);
    if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
  }
  const welcome = path.join(root, 'Desktop', 'Welcome to ErdOS.txt');
  if (!fs.existsSync(welcome)) {
    fs.writeFileSync(
      welcome,
      'Welcome to ErdOS!\n\nOpen the Start menu to launch apps.\nTry ERDAI, the Browser, Games, and more.\n',
      'utf8'
    );
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: 'ErdOS',
    backgroundColor: '#061018',
    show: false,
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

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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
}));

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
  if (stat.size > 2 * 1024 * 1024) throw new Error('File too large to open in Notepad');
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

function resolveSafe(targetPath) {
  const resolved = path.resolve(targetPath || getHomeRoot());
  const root = path.resolve(getHomeRoot());
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    // Allow absolute paths under user home for convenience in file manager
    const home = path.resolve(os.homedir());
    if (resolved !== home && !resolved.startsWith(home + path.sep)) {
      throw new Error('Access denied outside home directories');
    }
  }
  return resolved;
}
