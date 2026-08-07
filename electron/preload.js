const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('erdos', {
  getSystemInfo: () => ipcRenderer.invoke('erdos:get-system-info'),
  listDir: (targetPath) => ipcRenderer.invoke('erdos:list-dir', targetPath),
  readFile: (targetPath) => ipcRenderer.invoke('erdos:read-file', targetPath),
  writeFile: (targetPath, content) => ipcRenderer.invoke('erdos:write-file', targetPath, content),
  createFolder: (targetPath) => ipcRenderer.invoke('erdos:create-folder', targetPath),
  deletePath: (targetPath) => ipcRenderer.invoke('erdos:delete-path', targetPath),
  openExternal: (url) => ipcRenderer.invoke('erdos:open-external', url),
  pickSavePath: (defaultName) => ipcRenderer.invoke('erdos:pick-save-path', defaultName),
  pickOpenPath: () => ipcRenderer.invoke('erdos:pick-open-path'),
});
