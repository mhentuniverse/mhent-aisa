const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('AisaDesktop', {
  isDesktop: true,
  platform: process.platform,

  // File & Directory Operations
  openPath: (targetPath) => ipcRenderer.invoke('desktop:open-path', targetPath),
  showInFolder: (targetPath) => ipcRenderer.invoke('desktop:show-in-folder', targetPath),
  readFile: (filePath, encoding = 'utf-8') => ipcRenderer.invoke('desktop:read-file', { filePath, encoding }),
  writeFile: (filePath, content) => ipcRenderer.invoke('desktop:write-file', { filePath, content }),
  readDirectory: (dirPath) => ipcRenderer.invoke('desktop:read-dir', dirPath),
  searchFiles: (dirPath, keyword) => ipcRenderer.invoke('desktop:search-files', { dirPath, keyword }),

  // Dialogs
  openFileDialog: (options = {}) => ipcRenderer.invoke('desktop:open-file-dialog', options),
  openDirectoryDialog: (options = {}) => ipcRenderer.invoke('desktop:open-dir-dialog', options),

  // System Paths
  getSpecialPaths: () => ipcRenderer.invoke('desktop:get-special-paths'),

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // Local JSON Chat Logs Persistence
  saveChatLogs: (data) => ipcRenderer.invoke('desktop:save-chat-logs', data),
  loadChatLogs: () => ipcRenderer.invoke('desktop:load-chat-logs'),
  openChatsFolder: () => ipcRenderer.invoke('desktop:open-chats-folder')
});
