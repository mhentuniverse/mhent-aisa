const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
const http = require('http');
const url = require('url');

let mainWindow = null;
let localServer = null;
let localServerPort = 0;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg'
};

function startLocalServer() {
  return new Promise((resolve, reject) => {
    localServer = http.createServer((req, res) => {
      try {
        const parsedUrl = url.parse(req.url);
        let pathname = decodeURIComponent(parsedUrl.pathname);

        // API Endpoint: Quản lý Log Chat Local dạng JSON
        if (pathname === '/api/local-chats' || pathname.startsWith('/api/local-chats')) {
          const chatsDir = path.join(__dirname, '..', 'data', 'chats');
          if (!fs.existsSync(chatsDir)) {
            fs.mkdirSync(chatsDir, { recursive: true });
          }

          if (req.method === 'GET') {
            const allPath = path.join(chatsDir, 'sessions.json');
            res.writeHead(200, {
              'Content-Type': 'application/json; charset=utf-8',
              'Access-Control-Allow-Origin': '*'
            });
            if (fs.existsSync(allPath)) {
              res.end(fs.readFileSync(allPath, 'utf-8'));
            } else {
              res.end(JSON.stringify({ sessions: [] }));
            }
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body);
                if (parsed.sessions) {
                  fs.writeFileSync(path.join(chatsDir, 'sessions.json'), JSON.stringify(parsed.sessions, null, 2), 'utf-8');
                }
                if (parsed.currentSession && parsed.currentSession.id) {
                  const safeTitle = (parsed.currentSession.title || parsed.currentSession.id)
                    .replace(/[<>:"/\\|?*]/g, '_')
                    .slice(0, 45)
                    .trim();
                  fs.writeFileSync(path.join(chatsDir, `${parsed.currentSession.id}_${safeTitle}.json`), JSON.stringify(parsed.currentSession, null, 2), 'utf-8');
                }
                res.writeHead(200, {
                  'Content-Type': 'application/json; charset=utf-8',
                  'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ success: true, dir: chatsDir }));
              } catch (e) {
                res.writeHead(500, {
                  'Content-Type': 'application/json; charset=utf-8',
                  'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ success: false, error: e.message }));
              }
            });
            return;
          }
        }

        // SPA routing: route / or /chat or clean paths to index.html
        if (pathname === '/' || pathname === '/chat' || pathname.startsWith('/chat')) {
          pathname = '/index.html';
        }

        const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
        let filePath = path.join(__dirname, '..', safePath);

        // If file doesn't exist or is a directory without index.html
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          filePath = path.join(__dirname, '..', 'index.html');
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
          }
          res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*'
          });
          res.end(data);
        });
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error');
      }
    });

    localServer.listen(0, '127.0.0.1', () => {
      localServerPort = localServer.address().port;
      console.log(`[AISA Local Server] Listening on http://localhost:${localServerPort}`);
      resolve(localServerPort);
    });

    localServer.on('error', (err) => {
      console.warn('[AISA Local Server Error]:', err);
      reject(err);
    });
  });
}

async function createWindow() {
  if (!localServerPort) {
    try {
      await startLocalServer();
    } catch (e) {
      console.warn('Failed to start local server, fallback to file:', e);
    }
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 420,
    minHeight: 600,
    backgroundColor: '#0a0a0f',
    title: 'AISA — Personal Companion AI Sanctuary (MHEnt Universe)',
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

  // Strip Referer & Origin headers on Google user content (avatars) so CDN does not return 403 Forbidden
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.googleusercontent.com/*', '*://lh3.googleusercontent.com/*'] },
    (details, callback) => {
      delete details.requestHeaders['Referer'];
      delete details.requestHeaders['Origin'];
      callback({ requestHeaders: details.requestHeaders });
    }
  );

  // Handle OAuth popups (Firebase Google Sign-In)
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (targetUrl.includes('firebaseapp.com') || targetUrl.includes('accounts.google.com')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 520,
          height: 650,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        }
      };
    }
    shell.openExternal(targetUrl);
    return { action: 'deny' };
  });

  // Load the web app via localhost to enable Firebase Auth & Google Sign-In
  if (localServerPort) {
    mainWindow.loadURL(`http://localhost:${localServerPort}/`);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));
  }

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

  app.whenReady().then(async () => {
    await createWindow();

    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) await createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (localServer) {
    try { localServer.close(); } catch (e) {}
    localServer = null;
  }
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

// 10. Local Chat Logs (JSON File Persistence)
ipcMain.handle('desktop:save-chat-logs', async (event, { sessions, currentSession }) => {
  try {
    const chatsDir = path.join(__dirname, '..', 'data', 'chats');
    if (!fs.existsSync(chatsDir)) {
      await fsPromises.mkdir(chatsDir, { recursive: true });
    }
    // 1. Lưu tổng hợp toàn bộ các phiên trò chuyện vào data/chats/sessions.json
    if (sessions) {
      const allPath = path.join(chatsDir, 'sessions.json');
      await fsPromises.writeFile(allPath, JSON.stringify(sessions, null, 2), 'utf-8');
    }
    // 2. Lưu riêng phiên hiện tại thành file JSON độc lập
    if (currentSession && currentSession.id) {
      const safeTitle = (currentSession.title || currentSession.id)
        .replace(/[<>:"/\\|?*]/g, '_')
        .slice(0, 45)
        .trim();
      const sessionPath = path.join(chatsDir, `${currentSession.id}_${safeTitle}.json`);
      await fsPromises.writeFile(sessionPath, JSON.stringify(currentSession, null, 2), 'utf-8');
    }
    return { success: true, dir: chatsDir };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('desktop:load-chat-logs', async () => {
  try {
    const chatsDir = path.join(__dirname, '..', 'data', 'chats');
    const allPath = path.join(chatsDir, 'sessions.json');
    if (fs.existsSync(allPath)) {
      const data = await fsPromises.readFile(allPath, 'utf-8');
      return { success: true, sessions: JSON.parse(data) };
    }
    return { success: true, sessions: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('desktop:open-chats-folder', async () => {
  try {
    const chatsDir = path.join(__dirname, '..', 'data', 'chats');
    if (!fs.existsSync(chatsDir)) {
      await fsPromises.mkdir(chatsDir, { recursive: true });
    }
    await shell.openPath(chatsDir);
    return { success: true, path: chatsDir };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
