const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 420,
    minHeight: 600,
    backgroundColor: '#0a0a0f',
    title: 'AISA — Personal Companion AI (MHEnt Universe)',
    icon: path.join(__dirname, '..', 'assets', 'logo-design.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false // Allows accessing local resources when needed
    }
  });

  // Load the web app
  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ============================================================================
// IPC Handlers: Desktop Capabilities
// ============================================================================

// 1. Open file or directory in default system application
ipcMain.handle('desktop:open-path', async (event, targetPath) => {
  try {
    if (!targetPath || typeof targetPath !== 'string') {
      return { success: false, error: 'Đường dẫn không hợp lệ' };
    }
    const resolvedPath = path.resolve(targetPath);
    if (!fs.existsSync(resolvedPath)) {
      return { success: false, error: `Tệp hoặc thư mục không tồn tại: ${resolvedPath}` };
    }
    const errMsg = await shell.openPath(resolvedPath);
    if (errMsg) {
      return { success: false, error: errMsg };
    }
    return { success: true, path: resolvedPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 2. Reveal item in Windows Explorer
ipcMain.handle('desktop:show-in-folder', async (event, targetPath) => {
  try {
    if (!targetPath || typeof targetPath !== 'string') {
      return { success: false, error: 'Đường dẫn không hợp lệ' };
    }
    const resolvedPath = path.resolve(targetPath);
    if (fs.existsSync(resolvedPath)) {
      shell.showItemInFolder(resolvedPath);
      return { success: true, path: resolvedPath };
    }
    return { success: false, error: 'Tệp không tồn tại' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 3. Read file content
ipcMain.handle('desktop:read-file', async (event, { filePath, encoding = 'utf-8' }) => {
  try {
    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
      return { success: false, error: `Tệp không tồn tại: ${resolvedPath}` };
    }
    const stats = await fsPromises.stat(resolvedPath);
    if (stats.size > 15 * 1024 * 1024) {
      return { success: false, error: 'Tệp quá lớn (>15MB) để đọc trực tiếp' };
    }
    const content = await fsPromises.readFile(resolvedPath, encoding);
    return {
      success: true,
      path: resolvedPath,
      name: path.basename(resolvedPath),
      size: stats.size,
      content
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 4. Write file content
ipcMain.handle('desktop:write-file', async (event, { filePath, content }) => {
  try {
    const resolvedPath = path.resolve(filePath);
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      await fsPromises.mkdir(dir, { recursive: true });
    }
    await fsPromises.writeFile(resolvedPath, content, 'utf-8');
    return { success: true, path: resolvedPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 5. Read directory entries
ipcMain.handle('desktop:read-dir', async (event, dirPath) => {
  try {
    const targetDir = path.resolve(dirPath || app.getPath('desktop'));
    if (!fs.existsSync(targetDir)) {
      return { success: false, error: `Thư mục không tồn tại: ${targetDir}` };
    }
    const entries = await fsPromises.readdir(targetDir, { withFileTypes: true });
    const items = [];
    for (const ent of entries) {
      // Ignore hidden/system files
      if (ent.name.startsWith('$') || ent.name === 'desktop.ini' || ent.name === 'Thumbs.db') continue;
      const full = path.join(targetDir, ent.name);
      try {
        const stats = await fsPromises.stat(full);
        items.push({
          name: ent.name,
          path: full,
          isDirectory: ent.isDirectory(),
          size: stats.size,
          updatedAt: stats.mtimeMs
        });
      } catch (e) {
        items.push({
          name: ent.name,
          path: full,
          isDirectory: ent.isDirectory(),
          size: 0,
          updatedAt: 0
        });
      }
    }
    // Sort directories first, then alphabetical
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return { success: true, currentPath: targetDir, items };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 6. Search files within a folder
ipcMain.handle('desktop:search-files', async (event, { dirPath, keyword }) => {
  try {
    const targetDir = path.resolve(dirPath || app.getPath('desktop'));
    if (!fs.existsSync(targetDir)) {
      return { success: false, error: 'Thư mục không tồn tại' };
    }
    const q = (keyword || '').toLowerCase();
    const results = [];

    async function walk(dir, depth = 0) {
      if (depth > 4 || results.length >= 40) return; // Prevent deep freeze
      try {
        const list = await fsPromises.readdir(dir, { withFileTypes: true });
        for (const item of list) {
          if (item.name.startsWith('.') || item.name.startsWith('$')) continue;
          const full = path.join(dir, item.name);
          if (item.name.toLowerCase().includes(q)) {
            results.push({
              name: item.name,
              path: full,
              isDirectory: item.isDirectory()
            });
            if (results.length >= 40) break;
          }
          if (item.isDirectory() && !item.name.includes('node_modules')) {
            await walk(full, depth + 1);
          }
        }
      } catch (e) {}
    }

    await walk(targetDir);
    return { success: true, results };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 7. Dialogs: Open File & Directory
ipcMain.handle('desktop:open-file-dialog', async (event, options = {}) => {
  if (!mainWindow) return { canceled: true };
  const res = await dialog.showOpenDialog(mainWindow, {
    title: options.title || 'Chọn tệp tài liệu',
    properties: ['openFile'],
    filters: options.filters || [{ name: 'Mọi tệp', extensions: ['*'] }]
  });
  return res;
});

ipcMain.handle('desktop:open-dir-dialog', async (event, options = {}) => {
  if (!mainWindow) return { canceled: true };
  const res = await dialog.showOpenDialog(mainWindow, {
    title: options.title || 'Chọn thư mục không gian làm việc (Workspace)',
    properties: ['openDirectory']
  });
  return res;
});

// 8. System special paths
ipcMain.handle('desktop:get-special-paths', async () => {
  return {
    home: app.getPath('home'),
    desktop: app.getPath('desktop'),
    documents: app.getPath('documents'),
    downloads: app.getPath('downloads')
  };
});

// 9. Window Controls
ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});
ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});
ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
});
ipcMain.handle('window:is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});
