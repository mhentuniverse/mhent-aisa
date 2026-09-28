/**
 * AISA COMPANION - MAIN APPLICATION CONTROLLER
 * Multi-Session Chat Hub & MHEnt Luxury Dialog System
 * Miyazaki Haruto Entertainment Co., Ltd. - Project MHEnt. Universe
 */

// ============================================================================
// 1. MHENT UNIVERSE LUXURY CUSTOM DIALOG & ALERT SYSTEM
// ============================================================================
// Helper to render icon (either SVG string or emoji)
function setDialogIcon(el, icon) {
  if (!el) return;
  if (typeof icon === 'string' && icon.trim().startsWith('<')) {
    el.innerHTML = icon;
    return;
  }
  const emojiMap = {
    '🗑️': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
    '⭐': `<svg width="28" height="28" viewBox="0 0 24 24" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    '✏️': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
    '⚠️': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    '✨': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14"/></svg>`
  };
  if (typeof icon === 'string' && emojiMap[icon.trim()]) {
    el.innerHTML = emojiMap[icon.trim()];
    return;
  }
  el.textContent = icon;
}

window.AisaDialog = {
  confirm({
    title = "Xác Nhận",
    message = "Cậu có chắc chắn muốn thực hiện hành động này không?",
    submessage = "",
    icon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 4C10.5 1.5 7 1.5 5 4C3 6.5 4 10 7 12C4 12 1 15 2 18.5C3 22 7.5 21 10 19C10.5 21.5 13.5 21.5 14 19C16.5 21 21 22 22 18.5C23 15 20 12 17 12C20 10 21 6.5 19 4C17 1.5 13.5 1.5 12 4Z" fill="#f472b6"/><circle cx="12" cy="12" r="2.2" fill="#ffffff"/></svg>`,
    confirmText = "Xác Nhận",
    cancelText = "Hủy Bỏ",
    danger = false
  }) {
    return new Promise((resolve) => {
      const modal = document.getElementById('modal-custom-dialog');
      if (!modal) {
        resolve(window.confirm(message));
        return;
      }

      const titleEl = document.getElementById('dialog-title-text');
      const iconBadge = document.getElementById('dialog-icon-badge');
      const iconCircle = document.getElementById('dialog-icon-circle');
      const headEl = document.getElementById('dialog-prompt-heading');
      const subEl = document.getElementById('dialog-prompt-sub');
      const inputContainer = document.getElementById('dialog-input-container');
      const btnConfirm = document.getElementById('btn-dialog-confirm');
      const btnCancel = document.getElementById('btn-dialog-cancel');
      const btnClose = document.getElementById('btn-dialog-close-x');

      if (titleEl) titleEl.textContent = title;
      setDialogIcon(iconBadge, icon);
      setDialogIcon(iconCircle, icon);
      if (headEl) headEl.textContent = message;
      if (subEl) {
        subEl.textContent = submessage;
        subEl.style.display = submessage ? 'block' : 'none';
      }
      if (inputContainer) inputContainer.style.display = 'none';

      if (btnConfirm) {
        btnConfirm.textContent = confirmText;
        btnConfirm.className = danger ? 'btn-dialog-action btn-dialog-danger' : 'btn-dialog-action btn-dialog-confirm';
      }

      if (btnCancel) {
        btnCancel.textContent = cancelText;
        btnCancel.style.display = 'inline-flex';
      }

      modal.classList.add('active');

      const cleanup = (result) => {
        modal.classList.remove('active');
        if (btnConfirm) btnConfirm.onclick = null;
        if (btnCancel) btnCancel.onclick = null;
        if (btnClose) btnClose.onclick = null;
        modal.onclick = null;
        resolve(result);
      };

      if (btnConfirm) btnConfirm.onclick = () => cleanup(true);
      if (btnCancel) btnCancel.onclick = () => cleanup(false);
      if (btnClose) btnClose.onclick = () => cleanup(false);
      modal.onclick = (e) => {
        if (e.target === modal) cleanup(false);
      };
    });
  },

  alert({
    title = "Thông Báo",
    message = "",
    submessage = "",
    icon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.4 8.6L21 11L14.4 13.4L12 20L9.6 13.4L3 11L9.6 8.6L12 2Z" fill="#38bdf8"/><circle cx="12" cy="11" r="2" fill="#ffffff"/></svg>`,
    okText = "Đã Hiểu"
  }) {
    return new Promise((resolve) => {
      const modal = document.getElementById('modal-custom-dialog');
      if (!modal) {
        window.alert(message);
        resolve();
        return;
      }

      const titleEl = document.getElementById('dialog-title-text');
      const iconBadge = document.getElementById('dialog-icon-badge');
      const iconCircle = document.getElementById('dialog-icon-circle');
      const headEl = document.getElementById('dialog-prompt-heading');
      const subEl = document.getElementById('dialog-prompt-sub');
      const inputContainer = document.getElementById('dialog-input-container');
      const btnConfirm = document.getElementById('btn-dialog-confirm');
      const btnCancel = document.getElementById('btn-dialog-cancel');
      const btnClose = document.getElementById('btn-dialog-close-x');

      if (titleEl) titleEl.textContent = title;
      setDialogIcon(iconBadge, icon);
      setDialogIcon(iconCircle, icon);
      if (headEl) headEl.textContent = message;
      if (subEl) {
        subEl.textContent = submessage;
        subEl.style.display = submessage ? 'block' : 'none';
      }
      if (inputContainer) inputContainer.style.display = 'none';

      if (btnConfirm) {
        btnConfirm.textContent = okText;
        btnConfirm.className = 'btn-dialog-action btn-dialog-confirm';
      }

      if (btnCancel) {
        btnCancel.style.display = 'none';
      }

      modal.classList.add('active');

      const cleanup = () => {
        modal.classList.remove('active');
        if (btnConfirm) btnConfirm.onclick = null;
        if (btnClose) btnClose.onclick = null;
        modal.onclick = null;
        resolve();
      };

      if (btnConfirm) btnConfirm.onclick = cleanup;
      if (btnClose) btnClose.onclick = cleanup;
      modal.onclick = (e) => {
        if (e.target === modal) cleanup();
      };
    });
  },

  prompt({
    title = "Nhập Thông Tin",
    message = "Vui lòng nhập nội dung:",
    submessage = "",
    icon = null,
    defaultValue = "",
    placeholder = "Nhập tại đây...",
    confirmText = "Lưu Lại",
    cancelText = "Hủy Bỏ"
  }) {
    return new Promise((resolve) => {
      const modal = document.getElementById('modal-custom-dialog');
      if (!modal) {
        resolve(window.prompt(message, defaultValue));
        return;
      }

      const defaultIcon = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;
      const useIcon = icon || defaultIcon;

      const titleEl = document.getElementById('dialog-title-text');
      const iconBadge = document.getElementById('dialog-icon-badge');
      const iconCircle = document.getElementById('dialog-icon-circle');
      const headEl = document.getElementById('dialog-prompt-heading');
      const subEl = document.getElementById('dialog-prompt-sub');
      const inputContainer = document.getElementById('dialog-input-container');
      const inputField = document.getElementById('dialog-prompt-input');
      const btnConfirm = document.getElementById('btn-dialog-confirm');
      const btnCancel = document.getElementById('btn-dialog-cancel');
      const btnClose = document.getElementById('btn-dialog-close-x');

      if (titleEl) titleEl.textContent = title;
      setDialogIcon(iconBadge, useIcon);
      setDialogIcon(iconCircle, useIcon);
      if (headEl) headEl.textContent = message;
      if (subEl) {
        subEl.textContent = submessage;
        subEl.style.display = submessage ? 'block' : 'none';
      }

      if (inputContainer && inputField) {
        inputContainer.style.display = 'block';
        inputField.value = defaultValue || '';
        inputField.placeholder = placeholder;
      }

      if (btnConfirm) {
        btnConfirm.textContent = confirmText;
        btnConfirm.className = 'btn-dialog-action btn-dialog-confirm';
      }

      if (btnCancel) {
        btnCancel.textContent = cancelText;
        btnCancel.style.display = 'inline-flex';
      }

      modal.classList.add('active');

      if (inputField) {
        setTimeout(() => {
          inputField.focus();
          inputField.select();
        }, 80);
      }

      const cleanup = (result) => {
        modal.classList.remove('active');
        if (inputContainer) inputContainer.style.display = 'none';
        if (btnConfirm) btnConfirm.onclick = null;
        if (btnCancel) btnCancel.onclick = null;
        if (btnClose) btnClose.onclick = null;
        if (inputField) inputField.onkeydown = null;
        modal.onclick = null;
        resolve(result);
      };

      if (inputField) {
        inputField.onkeydown = (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            cleanup(inputField.value.trim());
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cleanup(null);
          }
        };
      }

      if (btnConfirm) btnConfirm.onclick = () => cleanup(inputField ? inputField.value.trim() : null);
      if (btnCancel) btnCancel.onclick = () => cleanup(null);
      if (btnClose) btnClose.onclick = () => cleanup(null);
      modal.onclick = (e) => {
        if (e.target === modal) cleanup(null);
      };
    });
  }
};

// ============================================================================
// 2. MAIN APPLICATION CONTROLLER WITH MULTI-SESSION ARCHITECTURE
// ============================================================================
window.AisaApp = {
  state: {
    sessions: [],          // Danh sách các phiên trò chuyện đa nhiệm
    currentSessionId: null,// ID của phiên đang kích hoạt
    mode: 'duo',           // 'duo' | 'harmony' | 'echo'
    scope: 'personal',     // 'personal' | 'workspace' | 'study' | 'portal'
    messages: [],          // Tin nhắn của phiên hiện tại
    isGenerating: false,
    pendingImage: null,
    pendingImageName: '',
    pendingFile: null,      // Tệp tài liệu/code/PDF đính kèm { name, size, sizeStr, type, isImage, isText, isPdf, icon, textContent, base64 }
    isDeepResearch: false,  // Chế độ Deep Research đa tầng
    isWebSearch: false,     // Chế độ Tra cứu Web (Mặc định tắt, người dùng chủ động bật khi cần)
    isThinking: false       // Chế độ Tư duy sâu (Step-by-step thinking)
  },

  cloudSync: {
    isSyncing: false,
    lastSyncTime: 0,
    syncTimer: null,
    unsubscribeFirestore: null
  },

  init() {
    this.loadState();
    this.setMode(this.state.mode || 'duo', false);
    this.bindEvents();
    this.syncToolsUI();
    this.updateGreeting();
    this.renderSessionsList();
    this.initRouter();
    this.renderMessages();

    // Khởi tạo Cổng Xác Thực Độc Quyền (Gatekeeper)
    if (window.AisaAuth) {
      window.AisaAuth.init();
    }

    // Khởi tạo các module vệ tinh
    if (window.AisaVoice) window.AisaVoice.init();
    if (window.AisaMemory) window.AisaMemory.init();
    if (window.AisaVision) window.AisaVision.init();

    // Khởi tạo Bộ Điều Phối Đồng Bộ Đám Mây Đa Thiết Bị (Cloud Auto-Sync Engine)
    this.initCloudSync();

    // Phục hồi lịch sử từ Cloudflare Edge D1 SQLite nếu máy chưa có
    if (this.state.sessions.length === 0 || (this.state.sessions.length === 1 && this.state.messages.length <= 2)) {
      this.restoreHistoryFromCloud();
    }
  },

  loadState() {
    try {
      const config = window.AISA_CONFIG;
      const rawSessions = localStorage.getItem(config.STORAGE.SESSIONS);
      const activeId = localStorage.getItem(config.STORAGE.ACTIVE_SESSION);

      if (rawSessions) {
        const parsed = JSON.parse(rawSessions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.state.sessions = parsed.map(s => {
            let msgs = s.messages || [];
            // Nếu phiên chỉ có tin chào mẫu cũ mà chưa có trao đổi người dùng, làm sạch để hiện giao diện Gemini
            if (msgs.length <= 2 && !msgs.some(m => m.role === 'user')) {
              msgs = [];
            }
            return {
              ...s,
              messages: msgs.map(m => {
                if (m.role === 'assistant' && m.text) {
                  const clean = window.AisaEngine ? window.AisaEngine.cleanReply(m.text) : m.text;
                  return { ...m, text: clean };
                }
                return m;
              })
            };
          });
        }
      }

      // Tương thích ngược: Nếu chưa có danh sách sessions nhưng có lịch sử v2 cũ
      if (this.state.sessions.length === 0) {
        const legacyHistory = localStorage.getItem(config.STORAGE.HISTORY);
        let oldMsgs = [];
        if (legacyHistory) {
          try {
            const p = JSON.parse(legacyHistory);
            if (Array.isArray(p)) {
              oldMsgs = p.map(m => {
                if (m.role === 'assistant' && m.text) {
                  return { ...m, text: window.AisaEngine ? window.AisaEngine.cleanReply(m.text) : m.text };
                }
                return m;
              });
            }
          } catch (e) {}
        }

        const initialMsgs = oldMsgs.some(m => m.role === 'user') ? oldMsgs : [];
        if (initialMsgs.length > 0) {
          const initialTitle = this.deriveSessionTitle(initialMsgs) || 'Phiên trò chuyện';
          const defaultSession = {
            id: 'session-' + Date.now(),
            title: initialTitle,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            mode: 'duo',
            scope: 'personal',
            messages: initialMsgs
          };
          this.state.sessions = [defaultSession];
        }
      }

      // Lọc bỏ các phiên rỗng không có tin nhắn người dùng (giữ lịch sử sạch sẽ chuẩn Gemini)
      this.state.sessions = (this.state.sessions || []).filter(s => Array.isArray(s.messages) && s.messages.some(m => m.role === 'user'));

      // Kiểm tra tham số 'id' trên thanh địa chỉ URL
      const urlParams = new URLSearchParams(window.location.search);
      const urlSessionId = urlParams.get('id');

      let current = null;
      if (urlSessionId) {
        current = this.state.sessions.find(s => s.id === urlSessionId);
      }

      if (current) {
        this.state.currentSessionId = current.id;
        this.state.messages = current.messages || [];
        this.state.mode = current.mode || 'duo';
      } else {
        // Màn hình ban đầu root (/): hiển thị Hero Greeting giới thiệu, chưa chọn phiên nào
        this.state.currentSessionId = null;
        this.state.messages = [];
        this.state.mode = 'duo';
        localStorage.removeItem(config.STORAGE.ACTIVE_SESSION);
        localStorage.setItem(config.STORAGE.HISTORY, JSON.stringify([]));
        localStorage.setItem(config.STORAGE.ACTIVE_MODE, 'duo');
      }

      // Nạp mode, scope và model
      if (current && current.mode) {
        this.state.mode = current.mode;
      } else if (!urlSessionId) {
        this.state.mode = 'duo';
      } else {
        const savedMode = localStorage.getItem(config.STORAGE.ACTIVE_MODE);
        if (savedMode) this.state.mode = savedMode;
      }

      const savedScope = localStorage.getItem(config.STORAGE.ACTIVE_SCOPE);
      if (savedScope) this.state.scope = savedScope;

      const savedModel = localStorage.getItem('aisa_selected_model');
      if (savedModel && window.AISA_CONFIG) {
        window.AISA_CONFIG.MODEL = savedModel;
      }

    } catch (e) {
      console.warn('Could not load saved state:', e);
      this.state.currentSessionId = null;
      this.state.messages = [];
      this.state.mode = 'duo';
    }
  },

  saveState() {
    try {
      const config = window.AISA_CONFIG;
      // Cập nhật messages của session hiện tại vào sessions array nếu có session đang hoạt động
      if (this.state.currentSessionId) {
        const currentSession = this.state.sessions.find(s => s.id === this.state.currentSessionId);
        if (currentSession) {
          currentSession.messages = this.state.messages;
          currentSession.updatedAt = Date.now();
          currentSession.mode = this.state.mode;
          currentSession.scope = this.state.scope;
        }
      }

      localStorage.setItem(config.STORAGE.SESSIONS, JSON.stringify(this.state.sessions));
      if (this.state.currentSessionId) {
        localStorage.setItem(config.STORAGE.ACTIVE_SESSION, this.state.currentSessionId);
        localStorage.setItem(config.STORAGE.HISTORY, JSON.stringify(this.state.messages));
      } else {
        localStorage.removeItem(config.STORAGE.ACTIVE_SESSION);
        localStorage.setItem(config.STORAGE.HISTORY, JSON.stringify([]));
      }
      localStorage.setItem(config.STORAGE.ACTIVE_MODE, this.state.mode);
      localStorage.setItem(config.STORAGE.ACTIVE_SCOPE, this.state.scope);

      // Tự động đồng bộ lên Cloud (D1 & Firestore) trong nền nếu có phiên đang mở
      if (this.state.currentSessionId) {
        this.debounceSyncCloud();
      }
    } catch (e) {}
  },

  // --------------------------------------------------------------------------
  // SPA URL ROUTER & MULTI-SESSION CONTROLLER
  // Quản lý URL / và /chat?id=... mượt mà, phản chiếu trực tiếp lên thanh địa chỉ
  // --------------------------------------------------------------------------
  updateUrlRoute(path, queryParams = {}) {
    try {
      const search = new URLSearchParams(queryParams).toString();
      if (window.location.protocol === 'file:') {
        const newUrl = search ? `?${search}` : (window.location.pathname.split('/').pop() || 'index.html');
        window.history.pushState(null, '', newUrl);
        return;
      }
      const targetUrl = path + (search ? `?${search}` : '');
      const currentUrl = window.location.pathname + window.location.search;
      if (currentUrl !== targetUrl) {
        window.history.pushState(null, '', targetUrl);
      }
    } catch (e) {
      console.warn('[Router Warning]:', e);
    }
  },

  initRouter() {
    const handleRoute = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('id');
      const pathname = window.location.pathname;

      if (sessionId) {
        const existing = this.state.sessions.find(s => s.id === sessionId);
        if (existing) {
          this.switchSession(sessionId, false);
          return;
        }
      }

      // Nếu không có id hoặc ở root /
      if (!sessionId || pathname === '/' || pathname.endsWith('/index.html')) {
        this.openNewChatIntro(false);
      }
    };

    window.addEventListener('popstate', handleRoute);
  },

  openNewChatIntro(updateUrl = true) {
    this.saveState();
    this.state.currentSessionId = null;
    this.state.messages = [];
    this.clearAttachedFile();
    this.setMode('duo', true);

    const input = document.getElementById('chat-input');
    if (input) {
      input.value = '';
      input.style.height = 'auto';
    }

    if (updateUrl) {
      this.updateUrlRoute('/');
    }

    this.renderSessionsList();
    this.renderMessages();
  },

  createNewSession(title = 'Phiên trò chuyện mới', shouldSave = true) {
    const newSession = {
      id: 'session-' + Date.now(),
      title: title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      mode: this.state.mode,
      scope: this.state.scope,
      messages: []
    };

    this.state.sessions.unshift(newSession);
    this.state.currentSessionId = newSession.id;
    this.state.messages = [];

    this.updateUrlRoute('/chat', { id: newSession.id });

    if (shouldSave) {
      this.saveState();
    }
    this.renderSessionsList();
    this.renderMessages();
  },

  switchSession(sessionId, updateUrl = true) {
    if (this.state.currentSessionId === sessionId) return;

    this.saveState();
    const target = this.state.sessions.find(s => s.id === sessionId);
    if (!target) {
      this.openNewChatIntro(updateUrl);
      return;
    }

    this.state.currentSessionId = target.id;
    this.state.messages = target.messages || [];
    if (target.mode) {
      this.setMode(target.mode, false);
    }

    if (updateUrl) {
      this.updateUrlRoute('/chat', { id: target.id });
    }

    this.saveState();
    this.renderSessionsList();
    this.renderMessages();
  },

  openMediaGalleryModal() {
    const modal = document.getElementById('modal-media-gallery');
    const grid = document.getElementById('media-gallery-grid');
    if (!modal || !grid) return;

    const mediaItems = [];
    (this.state.sessions || []).forEach(session => {
      (session.messages || []).forEach(msg => {
        if (msg.file && (msg.file.dataUrl || msg.file.type || msg.file.name)) {
          mediaItems.push({
            sessionId: session.id,
            sessionTitle: session.title,
            file: msg.file,
            timestamp: msg.timestamp || session.updatedAt
          });
        }
      });
    });

    if (mediaItems.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 36px 16px; color: var(--text-muted); font-size: 0.86rem; line-height: 1.6;">
          Chưa có hình ảnh hoặc tài liệu nào được gửi.<br>Khi cậu chia sẻ ảnh trong chat, tất cả sẽ tự động quy tụ tại đây! 🖼️
        </div>
      `;
    } else {
      grid.innerHTML = mediaItems.map(item => {
        const isImg = item.file.type && item.file.type.startsWith('image/');
        const preview = isImg && item.file.dataUrl
          ? `<img src="${item.file.dataUrl}" alt="${this.escapeHtml(item.file.name || 'Ảnh')}" class="media-gallery-thumb">`
          : `<div class="media-gallery-thumb"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>`;
        return `
          <div class="media-gallery-card" onclick="window.AisaApp.switchSession('${item.sessionId}'); document.getElementById('modal-media-gallery').style.display='none'; document.getElementById('modal-media-gallery').classList.remove('active');" title="Mở phiên: ${this.escapeQuotes(item.sessionTitle)}">
            ${preview}
            <div class="media-gallery-name">${this.escapeHtml(item.file.name || 'Tệp đính kèm')}</div>
          </div>
        `;
      }).join('');
    }

    modal.style.display = 'flex';
    modal.classList.add('active');
  },

  async deleteSession(sessionId, e) {
    if (e) e.stopPropagation();

    const target = this.state.sessions.find(s => s.id === sessionId);
    if (!target) return;

    this.closeSessionContextMenu();

    const confirmed = await window.AisaDialog.confirm({
      title: 'Xóa Phiên Trò Chuyện',
      message: `Cậu có chắc muốn xóa phiên "${target.title}" không nè?`,
      submessage: 'Toàn bộ nội dung của phiên này sẽ được dọn sạch khỏi tất cả thiết bị đồng bộ.',
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
      confirmText: 'Xóa Phiên',
      cancelText: 'Giữ Lại',
      danger: true
    });

    if (!confirmed) return;

    this.state.sessions = this.state.sessions.filter(s => s.id !== sessionId);

    // Xóa phiên trên Cloud D1 và Firestore
    if (window.AisaEngine && window.AisaEngine.deleteCloudSession) {
      window.AisaEngine.deleteCloudSession(sessionId);
    }
    if (window.AisaAuth && window.AisaAuth.db) {
      window.AisaAuth.db.collection('aisa_sessions').doc(sessionId).delete().catch(() => {});
    }

    if (this.state.sessions.length === 0 || this.state.currentSessionId === sessionId) {
      this.openNewChatIntro(true);
      return;
    }

    this.saveState();
    this.renderSessionsList();
    this.renderMessages();
  },

  toggleSessionFavorite(sessionId, e) {
    if (e) e.stopPropagation();
    const target = this.state.sessions.find(s => s.id === sessionId);
    if (!target) return;

    target.favorite = !target.favorite;
    target.updatedAt = Date.now();
    this.closeSessionContextMenu();
    this.saveState();
    this.renderSessionsList();

    if (window.AisaToast) {
      window.AisaToast.show(target.favorite ? 'Đã ghim cuộc trò chuyện vào mục Yêu thích ⭐' : 'Đã bỏ ghim Yêu thích');
    }
  },

  async promptRenameSession(sessionId, e) {
    if (e) e.stopPropagation();
    const target = this.state.sessions.find(s => s.id === sessionId);
    if (!target) return;

    this.closeSessionContextMenu();

    const newTitle = await window.AisaDialog.prompt({
      title: 'Đổi Tên Cuộc Trò Chuyện',
      message: 'Đặt tên gợi nhớ cho cuộc trò chuyện này:',
      defaultValue: target.title,
      placeholder: 'Tên cuộc trò chuyện...',
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
      confirmText: 'Lưu Lại',
      cancelText: 'Hủy Bỏ'
    });

    if (newTitle && newTitle.trim() && newTitle.trim() !== target.title) {
      target.title = newTitle.trim();
      target.updatedAt = Date.now();
      this.saveState();
      this.renderSessionsList();
      if (window.AisaToast) {
        window.AisaToast.show('Đã cập nhật tên cuộc trò chuyện ✨');
      }
    }
  },

  openSessionContextMenu(sessionId, targetElement, clientX, clientY) {
    const menu = document.getElementById('session-context-menu');
    if (!menu) return;

    const session = this.state.sessions.find(s => s.id === sessionId);
    if (!session) return;

    const favLabel = document.getElementById('ctx-fav-label');
    if (favLabel) {
      favLabel.textContent = session.favorite ? 'Bỏ ghim Yêu thích' : 'Ghim vào Yêu thích';
    }

    const btnFav = document.getElementById('ctx-item-favorite');
    const btnRename = document.getElementById('ctx-item-rename');
    const btnDelete = document.getElementById('ctx-item-delete');

    if (btnFav) btnFav.onclick = (e) => this.toggleSessionFavorite(sessionId, e);
    if (btnRename) btnRename.onclick = (e) => this.promptRenameSession(sessionId, e);
    if (btnDelete) btnDelete.onclick = (e) => this.deleteSession(sessionId, e);

    menu.style.display = 'flex';

    // Position menu near touch point or target button
    const menuWidth = 210;
    const menuHeight = 135;
    let posX = clientX != null ? clientX : 0;
    let posY = clientY != null ? clientY : 0;

    if (clientX == null && targetElement) {
      const rect = targetElement.getBoundingClientRect();
      posX = rect.right - menuWidth;
      posY = rect.bottom + 4;
    }

    // Viewport bounds checking
    if (posX + menuWidth > window.innerWidth - 10) {
      posX = window.innerWidth - menuWidth - 10;
    }
    if (posX < 10) posX = 10;

    if (posY + menuHeight > window.innerHeight - 10) {
      posY = window.innerHeight - menuHeight - 10;
    }
    if (posY < 10) posY = 10;

    menu.style.left = `${posX}px`;
    menu.style.top = `${posY}px`;

    // Click outside listener
    const onOutside = (e) => {
      if (!menu.contains(e.target) && e.target !== targetElement && !targetElement.contains(e.target)) {
        this.closeSessionContextMenu();
        document.removeEventListener('pointerdown', onOutside);
      }
    };
    setTimeout(() => {
      document.addEventListener('pointerdown', onOutside);
    }, 50);
  },

  closeSessionContextMenu() {
    const menu = document.getElementById('session-context-menu');
    if (menu) {
      menu.style.display = 'none';
    }
  },

  initTouchContextMenu(container) {
    if (!container) return;

    container.querySelectorAll('.session-item').forEach(item => {
      const sId = item.getAttribute('data-session-id');
      if (!sId) return;

      // 1. Right click for Desktop
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.openSessionContextMenu(sId, item, e.clientX, e.clientY);
      });

      // 2. Touch Hold for Mobile (700ms with haptic vibration)
      let touchTimer = null;
      let startX = 0;
      let startY = 0;

      item.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;

        touchTimer = setTimeout(() => {
          if (navigator.vibrate) {
            try { navigator.vibrate(40); } catch(err) {}
          }
          item.classList.add('holding');
          const t = e.touches[0] || e.changedTouches[0];
          this.openSessionContextMenu(sId, item, t ? t.clientX : null, t ? t.clientY : null);
          touchTimer = null;
        }, 700);
      }, { passive: true });

      item.addEventListener('touchmove', (e) => {
        if (!touchTimer) return;
        const dx = Math.abs(e.touches[0].clientX - startX);
        const dy = Math.abs(e.touches[0].clientY - startY);
        if (dx > 10 || dy > 10) {
          clearTimeout(touchTimer);
          touchTimer = null;
          item.classList.remove('holding');
        }
      }, { passive: true });

      item.addEventListener('touchend', () => {
        if (touchTimer) {
          clearTimeout(touchTimer);
          touchTimer = null;
        }
        item.classList.remove('holding');
      });

      item.addEventListener('touchcancel', () => {
        if (touchTimer) {
          clearTimeout(touchTimer);
          touchTimer = null;
        }
        item.classList.remove('holding');
      });
    });
  },

  renderSessionsList(searchQuery = '') {
    const container = document.getElementById('sidebar-sessions-list');
    const badge = document.getElementById('sessions-count-badge');
    if (!container) return;

    let sessions = [...this.state.sessions];
    const q = (searchQuery || '').trim().toLowerCase();
    if (q) {
      sessions = sessions.filter(s => {
        const titleMatch = (s.title || '').toLowerCase().includes(q);
        const msgMatch = (s.messages || []).some(m => (m.content || '').toLowerCase().includes(q));
        return titleMatch || msgMatch;
      });
    }

    if (badge) badge.textContent = sessions.length;

    if (sessions.length === 0) {
      if (q) {
        container.innerHTML = `<div class="sessions-empty-tip">Không tìm thấy cuộc trò chuyện nào khớp với "${this.escapeHtml(searchQuery)}". 🔍</div>`;
      } else {
        container.innerHTML = `<div class="sessions-empty-tip">Chưa có phiên chat nào. Bấm nút phía trên để tạo nhé! ✨</div>`;
      }
      return;
    }

    const getSessionSvg = (mode, isFav) => {
      if (isFav) {
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
      }
      if (mode === 'harmony') {
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 4C10.5 1.5 7 1.5 5 4C3 6.5 4 10 7 12C4 12 1 15 2 18.5C3 22 7.5 21 10 19C10.5 21.5 13.5 21.5 14 19C16.5 21 21 22 22 18.5C23 15 20 12 17 12C20 10 21 6.5 19 4C17 1.5 13.5 1.5 12 4Z" fill="#f472b6"/><circle cx="12" cy="12" r="2.2" fill="#ffffff"/></svg>`;
      }
      if (mode === 'echo') {
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 5L7.5 9C9 7.5 10.5 7 12 7C13.5 7 15 7.5 16.5 9L19 5C17 2.5 15 1.5 12 1.5C9 1.5 7 2.5 5 5Z" fill="#a78bfa"/><circle cx="12" cy="14" r="6.5" fill="#8b5cf6" fill-opacity="0.35" stroke="#a78bfa" stroke-width="1.4"/><circle cx="9.8" cy="13" r="1.3" fill="#ffffff"/><circle cx="14.2" cy="13" r="1.3" fill="#ffffff"/></svg>`;
      }
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
    };

    const renderCard = (s, isFav) => {
      const isActive = s.id === this.state.currentSessionId;
      const timeStr = this.formatSessionTime(s.updatedAt || s.createdAt);
      const iconSvg = getSessionSvg(s.mode, isFav);

      return `
        <div class="session-item ${isActive ? 'active' : ''} ${isFav ? 'is-favorite' : ''}" 
             data-session-id="${s.id}" 
             onclick="window.AisaApp.switchSession('${s.id}')" 
             title="${this.escapeQuotes(s.title)} (Giữ để mở menu)">
          <div class="session-item-main">
            <span class="session-item-icon">${iconSvg}</span>
            <div class="session-item-texts">
              <div class="session-item-title">${this.escapeHtml(s.title)}</div>
              <div class="session-item-meta">${timeStr} • ${(s.messages || []).length} tin</div>
            </div>
          </div>
          <button type="button" class="btn-session-options" data-session-id="${s.id}" title="Tùy chọn phiên">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2"/>
              <circle cx="12" cy="12" r="2"/>
              <circle cx="12" cy="19" r="2"/>
            </svg>
          </button>
        </div>
      `;
    };

    const favorites = sessions.filter(s => !!s.favorite);
    const recents = sessions.filter(s => !s.favorite);

    let html = '';

    // Favorites section: Divider -> Header -> Items
    if (favorites.length > 0) {
      html += `
        <div class="sidebar-divider"></div>
        <div class="sidebar-section-title favorites-header">
          <div style="display: flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span>Yêu thích</span>
            <span class="sessions-count-badge fav-badge">${favorites.length}</span>
          </div>
        </div>
        <div class="sessions-group group-favorites">
          ${favorites.map(s => renderCard(s, true)).join('')}
        </div>
      `;
    }

    // Recents section: Divider -> Header -> Items
    if (recents.length > 0 || favorites.length > 0) {
      html += `
        <div class="sidebar-divider"></div>
        <div class="sidebar-section-title sessions-header">
          <div style="display: flex; align-items: center; gap: 6px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>Gần đây</span>
            <span class="sessions-count-badge" id="sessions-count-badge">${recents.length}</span>
          </div>
          <button type="button" class="btn-sync-cloud-icon" id="btn-sync-cloud" onclick="window.AisaApp.syncWithCloud()" title="Làm mới & Đồng bộ đám mây ngay">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
              <path d="M12 13v6m-3-3 3 3 3-3" />
            </svg>
          </button>
        </div>
        <div class="sessions-group group-recents">
          ${recents.map(s => renderCard(s, false)).join('')}
        </div>
      `;
    }

    container.innerHTML = html;

    // Attach click listener for options button
    container.querySelectorAll('.btn-session-options').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const sId = btn.getAttribute('data-session-id');
        this.openSessionContextMenu(sId, btn);
      });
    });

    // Attach touch & long press listeners
    this.initTouchContextMenu(container);
  },

  formatSessionTime(timestamp) {
    if (!timestamp) return 'Vừa xong';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    if (isToday) return `${hh}:${mm}`;
    return `${date.getDate()}/${date.getMonth() + 1}`;
  },

  deriveSessionTitle(messages) {
    if (!messages || messages.length === 0) return 'Phiên trò chuyện mới';
    const firstUserMsg = messages.find(m => m.role === 'user');
    if (firstUserMsg && firstUserMsg.text) {
      const trimmed = firstUserMsg.text.trim();
      return trimmed.length > 28 ? trimmed.slice(0, 28) + '...' : trimmed;
    }
    return 'Cuộc trò chuyện';
  },

  updateGreeting() {
    const userName = (window.AISA_CONFIG && window.AISA_CONFIG.USER && window.AISA_CONFIG.USER.name) ? window.AISA_CONFIG.USER.name : "Master Yurika";
    const headerTitle = document.querySelector('.sanctuary-header h1');
    if (headerTitle) {
      headerTitle.innerHTML = `AISA <span>SANCTUARY</span>`;
    }
  },

  onUserAuthenticated(user) {
    if (!user) return;
    const isOrgOrInvalid = (str) => {
      if (!str || typeof str !== 'string') return true;
      const s = str.trim();
      return !s || s.includes('Entertainment') || s.includes('Co.,') || s.includes('Ltd') || s.length > 22;
    };
    const validName = (!isOrgOrInvalid(user.name)) ? user.name.trim() : "Master Yurika";

    if (window.AISA_CONFIG && window.AISA_CONFIG.USER) {
      window.AISA_CONFIG.USER.name = validName;
      window.AISA_CONFIG.USER.avatar = user.avatar || "🌸";
    }
    this.updateGreeting();

    // Khởi tạo Real-time Firestore sync & kéo dữ liệu Cloud đa thiết bị
    this.initFirestoreRealtime();
    this.syncFromCloud(true);

    // Cập nhật lại Hero Greeting hiển thị chuẩn xác tên Master Yurika
    if (!this.state.messages || this.state.messages.length <= 2 && !this.state.messages.some(m => m.role === 'user')) {
      this.state.messages = [];
      this.saveState();
      this.renderMessages();
    }
  },

  generateWelcomeMessages() {
    const hour = new Date().getHours();
    const masterName = (window.AISA_CONFIG && window.AISA_CONFIG.USER && window.AISA_CONFIG.USER.name) ? window.AISA_CONFIG.USER.name : "Master Yurika";
    let timeNote = "Chào buổi sáng rực rỡ nè!";
    if (hour >= 12 && hour < 18) timeNote = "Một buổi chiều làm việc thật nhiều năng lượng nha!";
    if (hour >= 18 && hour < 22) timeNote = "Buổi tối ấm áp và thư thái nhé!";
    if (hour >= 22 || hour < 5) timeNote = "Đêm đã muộn rồi nè, cậu nhớ chú ý sức khỏe đừng thức khuya quá nha...";

    return [
      {
        id: 'msg-welcome-h-' + Date.now(),
        role: 'assistant',
        speaker: 'HARMONY',
        avatar: '🌸',
        time: this.getCurrentTimeString(),
        text: `Chào mừng ${masterName} đã trở về với Sanctuary! 🌸 Em là Harmony nè. ${timeNote}\nĐây là **Sanctuary** riêng tư của chúng mình – nơi em và Echo luôn kề cận để lắng nghe mọi tâm sự, hỗ trợ công việc và đồng hành cùng cậu mỗi ngày! Cậu có thể trò chuyện, gửi ảnh tâm sự hay hỏi bất cứ điều gì nha! ✨`
      },
      {
        id: 'msg-welcome-e-' + (Date.now() + 1),
        role: 'assistant',
        speaker: 'ECHO',
        avatar: '😈',
        time: this.getCurrentTimeString(),
        text: `Hé lô ${masterName}! Còn tớ là Echo đây 😈. Bước vào đây rồi thì an tâm tuyệt đối nha, có cổng bảo vệ kiên cố chỉ mỗi cậu mới vào được thôi! Hôm nay có chuyện gì vui, có meme hay ho nào, hoặc lại bị deadline dí mà mò vào đây tìm hai đứa tớ thế hả? Khai mau đi nào!`
      }
    ];
  },

  async restoreHistoryFromCloud() {
    if (sessionStorage.getItem('aisa_session_cleared') === 'true') return;
    try {
      if (window.AisaEngine && window.AisaEngine.fetchHistory) {
        const history = await window.AisaEngine.fetchHistory(this.state.scope || 'personal');
        if (history && history.length > 0) {
          const restored = [];
          history.forEach((h, idx) => {
            if (h.role === 'user') {
              restored.push({
                id: 'msg-restored-' + idx,
                role: 'user',
                time: 'Đã lưu',
                text: h.content
              });
            } else {
              const isHarmony = (h.content || '').startsWith('HARMONY:');
              const clean = window.AisaEngine.cleanReply(h.content || '');
              restored.push({
                id: 'msg-restored-' + idx,
                role: 'assistant',
                speaker: isHarmony ? 'HARMONY' : 'ECHO',
                avatar: isHarmony ? '🌸' : '😈',
                time: 'Đã lưu',
                text: clean
              });
            }
          });

          if (restored.length > 0) {
            // Nạp trực tiếp vào phiên đang hoạt động nếu người dùng đang ở trong phiên đó và phiên đó rỗng
            const currentSession = this.state.currentSessionId ? this.state.sessions.find(s => s.id === this.state.currentSessionId) : null;
            if (currentSession && (currentSession.messages.length <= 2 && !currentSession.messages.some(m => m.role === 'user'))) {
              currentSession.messages = restored;
              currentSession.title = this.deriveSessionTitle(restored) || 'Ký ức Edge D1';
              this.state.messages = restored;
            } else {
              // Hoặc tạo một phiên D1 riêng trong danh sách phiên
              let cloudSession = this.state.sessions.find(s => s.id === 'session-d1-vault');
              if (!cloudSession) {
                cloudSession = {
                  id: 'session-d1-vault',
                  title: 'Ký ức Edge D1 đã lưu',
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  mode: 'duo',
                  scope: 'personal',
                  messages: restored
                };
                this.state.sessions.push(cloudSession);
              } else {
                cloudSession.messages = restored;
              }
            }

            this.saveState();
            this.renderSessionsList();
            if (this.state.currentSessionId) {
              this.renderMessages();
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Restore History Notice]:', e);
    }
  },

  // ==========================================================================
  // CLOUD AUTO-SYNC ENGINE (MULTI-DEVICE SEAMLESS REALTIME SYNC)
  // Cơ chế đồng bộ Đám mây tự động đa thiết bị giống Gemini (gemini.google.com)
  // ==========================================================================
  initCloudSync() {
    // 1. Đồng bộ khi chuyển đổi tab / cửa sổ (Tự động kéo chat vừa gửi từ điện thoại về máy tính)
    window.addEventListener('focus', () => {
      this.syncFromCloud(true);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.syncFromCloud(true);
      }
    });

    // 2. Chu kỳ kiểm tra ngầm định kỳ mỗi 25 giây khi tab đang mở
    setInterval(() => {
      if (document.visibilityState === 'visible' && !this.state.isGenerating) {
        this.syncFromCloud(true);
      }
    }, 25000);

    // 3. Kéo dữ liệu từ Cloud ngay khi khởi chạy (sau 600ms để UI render mượt mà trước)
    setTimeout(() => {
      this.syncFromCloud(true);
    }, 600);
  },

  initFirestoreRealtime() {
    if (!window.AisaAuth || !window.AisaAuth.db) return;
    try {
      if (this.cloudSync.unsubscribeFirestore) {
        this.cloudSync.unsubscribeFirestore();
      }
      this.cloudSync.unsubscribeFirestore = window.AisaAuth.db.collection('aisa_sessions')
        .onSnapshot((snapshot) => {
          if (!snapshot || snapshot.empty) return;
          const cloudSessions = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            cloudSessions.push({
              id: doc.id,
              ...data
            });
          });
          this.mergeCloudSessions(cloudSessions, true);
        }, (err) => {
          console.warn('[Firestore Realtime Sync Notice]:', err.message);
        });
    } catch (e) {
      console.warn('[Firestore Realtime Init Warning]:', e);
    }
  },

  debounceSyncCloud() {
    if (this.cloudSync.syncTimer) {
      clearTimeout(this.cloudSync.syncTimer);
    }
    this.cloudSync.syncTimer = setTimeout(() => {
      this.syncCurrentSessionToCloud();
    }, 600);
  },

  async syncCurrentSessionToCloud(sessionToSync = null) {
    const session = sessionToSync || this.state.sessions.find(s => s.id === this.state.currentSessionId);
    if (!session || !session.id) return;

    this.updateCloudSyncBadge('syncing');

    // 1. Đồng bộ lên Cloudflare Edge D1 SQLite qua Worker API
    try {
      if (window.AisaEngine && window.AisaEngine.saveCloudSession) {
        await window.AisaEngine.saveCloudSession(session);
      }
    } catch (e) {
      console.warn('[Cloud D1 Sync Notice]:', e);
    }

    // 2. Đồng bộ lên Firebase Firestore Realtime (nếu có kết nối)
    try {
      if (window.AisaAuth && window.AisaAuth.db) {
        await window.AisaAuth.db.collection('aisa_sessions').doc(session.id).set({
          id: session.id,
          title: session.title || 'Cuộc trò chuyện',
          mode: session.mode || 'duo',
          scope: session.scope || 'personal',
          messages: session.messages || [],
          createdAt: Number(session.createdAt) || Date.now(),
          updatedAt: Number(session.updatedAt) || Date.now()
        }, { merge: true });
      }
    } catch (fsErr) {
      console.warn('[Firestore Sync Notice]:', fsErr);
    }

    this.cloudSync.lastSyncTime = Date.now();
    this.updateCloudSyncBadge('synced');
  },

  async syncFromCloud(silent = false) {
    if (this.cloudSync.isSyncing) return;
    this.cloudSync.isSyncing = true;
    this.updateCloudSyncBadge('syncing');

    try {
      let cloudSessions = [];

      // 1. Thử lấy từ Cloudflare Edge D1 SQLite trước
      if (window.AisaEngine && window.AisaEngine.fetchCloudSessions) {
        const d1Sessions = await window.AisaEngine.fetchCloudSessions();
        if (Array.isArray(d1Sessions) && d1Sessions.length > 0) {
          cloudSessions = d1Sessions;
        }
      }

      // 2. Lấy bổ sung từ Firebase Firestore
      if (window.AisaAuth && window.AisaAuth.db) {
        try {
          const snapshot = await window.AisaAuth.db.collection('aisa_sessions')
            .orderBy('updatedAt', 'desc')
            .limit(30)
            .get();
          if (!snapshot.empty) {
            const fsSessions = [];
            snapshot.forEach(doc => fsSessions.push({ id: doc.id, ...doc.data() }));
            fsSessions.forEach(fsSess => {
              const existingIdx = cloudSessions.findIndex(s => s.id === fsSess.id);
              if (existingIdx === -1) {
                cloudSessions.push(fsSess);
              } else if ((Number(fsSess.updatedAt) || 0) > (Number(cloudSessions[existingIdx].updatedAt) || 0)) {
                cloudSessions[existingIdx] = fsSess;
              }
            });
          }
        } catch (fsErr) {
          console.warn('[Firestore Sync Read Notice]:', fsErr);
        }
      }

      if (cloudSessions.length > 0) {
        this.mergeCloudSessions(cloudSessions);
        if (!silent) {
          this.showToast('Đã đồng bộ phiên chat mới nhất từ Cloud! ☁️', '✨');
        }
      }

      this.cloudSync.lastSyncTime = Date.now();
      this.updateCloudSyncBadge('synced');
    } catch (err) {
      console.warn('[Cloud Sync Error]:', err);
      this.updateCloudSyncBadge('synced');
    } finally {
      this.cloudSync.isSyncing = false;
    }
  },

  mergeCloudSessions(cloudSessions, fromRealtime = false) {
    if (!Array.isArray(cloudSessions) || cloudSessions.length === 0) return;

    let hasChanges = false;
    let activeSessionUpdated = false;

    cloudSessions.forEach(cloudSess => {
      if (!cloudSess || !cloudSess.id) return;
      const localIdx = this.state.sessions.findIndex(s => s.id === cloudSess.id);

      if (localIdx === -1) {
        // Phiên mới được tạo từ thiết bị khác (iPhone ➔ PC hoặc ngược lại)
        this.state.sessions.push({
          id: cloudSess.id,
          title: cloudSess.title || 'Cuộc trò chuyện',
          mode: cloudSess.mode || 'duo',
          scope: cloudSess.scope || 'personal',
          createdAt: Number(cloudSess.createdAt) || Date.now(),
          updatedAt: Number(cloudSess.updatedAt) || Date.now(),
          messages: cloudSess.messages || []
        });
        hasChanges = true;
      } else {
        // Đã có phiên cục bộ, so sánh thời gian cập nhật
        const local = this.state.sessions[localIdx];
        const cloudUpdated = Number(cloudSess.updatedAt) || 0;
        const localUpdated = Number(local.updatedAt) || 0;

        if (cloudUpdated > localUpdated) {
          // Cloud có dữ liệu mới hơn (vừa nhắn tin trên thiết bị kia)
          this.state.sessions[localIdx] = {
            ...local,
            title: cloudSess.title || local.title,
            mode: cloudSess.mode || local.mode,
            scope: cloudSess.scope || local.scope,
            updatedAt: cloudUpdated,
            messages: cloudSess.messages || local.messages
          };
          hasChanges = true;

          // Chỉ cập nhật tin nhắn hiển thị nếu người dùng đang chủ động mở phiên này
          if (this.state.currentSessionId && this.state.currentSessionId === cloudSess.id) {
            this.state.messages = cloudSess.messages || [];
            if (cloudSess.mode && cloudSess.mode !== this.state.mode) {
              this.setMode(cloudSess.mode, false);
            }
            activeSessionUpdated = true;
          }
        }
      }
    });

    if (hasChanges) {
      // Sắp xếp phiên chat mới nhất lên đầu
      this.state.sessions.sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));

      // Lưu lại vào localStorage
      const config = window.AISA_CONFIG;
      localStorage.setItem(config.STORAGE.SESSIONS, JSON.stringify(this.state.sessions));
      if (this.state.currentSessionId) {
        localStorage.setItem(config.STORAGE.ACTIVE_SESSION, this.state.currentSessionId);
        localStorage.setItem(config.STORAGE.HISTORY, JSON.stringify(this.state.messages));
      } else {
        localStorage.removeItem(config.STORAGE.ACTIVE_SESSION);
        localStorage.setItem(config.STORAGE.HISTORY, JSON.stringify([]));
      }

      this.renderSessionsList();
      if (activeSessionUpdated && this.state.currentSessionId) {
        this.renderMessages();
      }
    }
  },

  updateCloudSyncBadge(status = 'synced') {
    const icon = document.getElementById('cloud-sync-icon');
    const text = document.getElementById('cloud-sync-text');
    const btn = document.getElementById('btn-cloud-sync');
    if (!icon) return;

    if (status === 'syncing') {
      icon.textContent = '🔄';
      icon.classList.add('spinning');
      if (text) text.textContent = 'Đang đồng bộ...';
      if (btn) btn.title = 'Đang đồng bộ với đám mây...';
    } else {
      icon.textContent = '☁️';
      icon.classList.remove('spinning');
      const timeStr = this.cloudSync.lastSyncTime ? this.formatSessionTime(this.cloudSync.lastSyncTime) : 'Vừa xong';
      if (text) text.textContent = 'Đồng bộ';
      if (btn) btn.title = `Đã đồng bộ Cloud lúc ${timeStr} (Nhấp để làm mới)`;
    }
  },

  bindEvents() {
    // Gemini Companion & Model Selector Modal (Tương tác chuẩn Google Gemini)
    const btnModelSelector = document.getElementById('btn-model-selector');
    const modalCompanion = document.getElementById('modal-companion-model');
    const btnCloseCompanion = document.getElementById('btn-close-companion-modal');
    const btnConfirmCompanion = document.getElementById('btn-confirm-companion');

    if (btnModelSelector && modalCompanion) {
      const syncCompanionModalState = () => {
        const activeModel = window.AISA_CONFIG.MODEL || 'aisa-v1';
        const activeMode = this.state.mode || 'duo';

        document.querySelectorAll('.companion-persona-card').forEach(card => {
          const isMatch = card.getAttribute('data-companion') === activeMode;
          card.classList.toggle('active', isMatch);
          const check = card.querySelector('.companion-check');
          if (check) check.textContent = isMatch ? '✓' : '';
        });

        document.querySelectorAll('.companion-model-item').forEach(item => {
          const isMatch = item.getAttribute('data-engine-model') === activeModel;
          item.classList.toggle('active', isMatch);
          const check = item.querySelector('.cmodel-check');
          if (check) check.textContent = isMatch ? '✓' : '';
        });

        this.updateModelBadge();
      };

      const openCompanionModal = () => {
        syncCompanionModalState();
        modalCompanion.classList.add('active');
        modalCompanion.style.display = 'flex';
      };

      const closeCompanionModal = () => {
        modalCompanion.classList.remove('active');
        modalCompanion.style.display = 'none';
      };

      btnModelSelector.addEventListener('click', (e) => {
        e.stopPropagation();
        openCompanionModal();
      });

      // Chọn người đồng hành (Persona Mode)
      document.querySelectorAll('.companion-persona-card').forEach(card => {
        card.addEventListener('click', () => {
          const companionId = card.getAttribute('data-companion');
          if (!companionId) return;

          document.querySelectorAll('.companion-persona-card').forEach(c => {
            c.classList.remove('active');
            const check = c.querySelector('.companion-check');
            if (check) check.textContent = '';
          });
          card.classList.add('active');
          const myCheck = card.querySelector('.companion-check');
          if (myCheck) myCheck.textContent = '✓';

          this.setMode(companionId);
        });
      });

      // Chọn mô hình AI Engine
      document.querySelectorAll('.companion-model-item').forEach(item => {
        item.addEventListener('click', () => {
          const modelId = item.getAttribute('data-engine-model');
          if (!modelId) return;

          document.querySelectorAll('.companion-model-item').forEach(i => {
            i.classList.remove('active');
            const check = i.querySelector('.cmodel-check');
            if (check) check.textContent = '';
          });
          item.classList.add('active');
          const myCheck = item.querySelector('.cmodel-check');
          if (myCheck) myCheck.textContent = '✓';

          window.AISA_CONFIG.MODEL = modelId;
          localStorage.setItem('aisa_selected_model', modelId);
          this.updateModelBadge();

          const scopeBadge = document.getElementById('current-scope-label');
          if (scopeBadge) {
            scopeBadge.innerHTML = `✨ Đang kết nối mô hình: <strong>${modelId}</strong>`;
          }
        });
      });

      // Đóng cửa sổ chọn Model & Companion
      if (btnCloseCompanion) {
        btnCloseCompanion.addEventListener('click', (e) => {
          e.stopPropagation();
          closeCompanionModal();
        });
      }
      if (btnConfirmCompanion) {
        btnConfirmCompanion.addEventListener('click', (e) => {
          e.stopPropagation();
          closeCompanionModal();
        });
      }
      modalCompanion.addEventListener('click', (e) => {
        if (e.target === modalCompanion) {
          closeCompanionModal();
        }
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalCompanion.classList.contains('active')) {
          closeCompanionModal();
        }
      });
    }

    // Nút Tạo Chat Mới Trên Topbar (Gemini Standard New Chat Pen)
    const btnNewChatTop = document.getElementById('btn-new-chat-top');
    if (btnNewChatTop) {
      btnNewChatTop.addEventListener('click', () => {
        this.openNewChatIntro(true);
      });
    }

    // Menu Hồ sơ Master & Tiện ích trong Avatar Dropdown (Gộp chức năng 3 chấm & Đăng xuất)
    const userBadgeBtn = document.getElementById('user-badge-inner');
    const userProfileDropdown = document.getElementById('user-profile-dropdown');

    if (userBadgeBtn && userProfileDropdown) {
      userBadgeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userProfileDropdown.classList.toggle('active');
      });

      // 1. Âm hưởng thư giãn 432Hz
      const itemAmbient = document.getElementById('more-item-ambient');
      const badgeAmbient = document.getElementById('more-badge-ambient');
      if (itemAmbient) {
        itemAmbient.addEventListener('click', (e) => {
          e.stopPropagation();
          const btnAmbient = document.getElementById('btn-toggle-ambient');
          if (btnAmbient) btnAmbient.click();

          setTimeout(() => {
            const isPlaying = document.body.classList.contains('ambient-playing') || (btnAmbient && btnAmbient.classList.contains('active'));
            if (badgeAmbient) {
              badgeAmbient.textContent = isPlaying ? 'Bật' : 'Tắt';
              badgeAmbient.classList.toggle('active', isPlaying);
            }
          }, 150);
        });
      }

      // 2. Đồng bộ Đám mây
      const itemCloud = document.getElementById('more-item-cloud');
      if (itemCloud) {
        itemCloud.addEventListener('click', () => {
          userProfileDropdown.classList.remove('active');
          const btnCloud = document.getElementById('btn-cloud-sync');
          if (btnCloud) btnCloud.click();
        });
      }

      // 3. Ngân hàng Ký ức
      const itemMemory = document.getElementById('more-item-memory');
      if (itemMemory) {
        itemMemory.addEventListener('click', () => {
          userProfileDropdown.classList.remove('active');
          const btnMemory = document.getElementById('btn-open-memory');
          if (btnMemory) btnMemory.click();
        });
      }

      // 4. Dọn dẹp phiên chat
      const itemClear = document.getElementById('more-item-clear');
      if (itemClear) {
        itemClear.addEventListener('click', () => {
          userProfileDropdown.classList.remove('active');
          const btnClear = document.getElementById('btn-clear-chat');
          if (btnClear) btnClear.click();
        });
      }

      // 5. Cài đặt Sanctuary
      const itemSettings = document.getElementById('more-item-settings');
      if (itemSettings) {
        itemSettings.addEventListener('click', () => {
          userProfileDropdown.classList.remove('active');
          const btnSettings = document.getElementById('btn-open-settings');
          if (btnSettings) btnSettings.click();
        });
      }

      // 6. Đăng xuất khỏi Sanctuary
      const btnUserLogout = document.getElementById('btn-user-menu-logout');
      if (btnUserLogout) {
        btnUserLogout.addEventListener('click', () => {
          userProfileDropdown.classList.remove('active');
          if (window.AisaAuth) {
            window.AisaAuth.confirmLogout();
          }
        });
      }

      // Đóng menu khi click ra ngoài
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#header-user-badge')) {
          userProfileDropdown.classList.remove('active');
        }
      });
    }

    // Mode Switchers
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.getAttribute('data-mode');
        this.setMode(mode);
      });
    });

    // Scope Selector Tabs
    document.querySelectorAll('.scope-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.scope-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const scope = btn.getAttribute('data-scope');
        this.setScope(scope);
      });
    });

    // Textarea input & send button
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('btn-send');

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      });

      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 140) + 'px';
      });

      // Hỗ trợ dán ảnh hoặc tệp văn bản trực tiếp từ Clipboard (Ctrl + V)
      input.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
          if (items[i].kind === 'file') {
            const blob = items[i].getAsFile();
            if (blob) {
              this.attachFile(blob);
              break;
            }
          }
        }
      });
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.handleSendMessage());
    }

    // Bộ 4 công cụ thông minh chuẩn Gemini (+): Tải tệp, Tra cứu Web, Deep Research, Tư duy sâu
    const btnCapsuleTools = document.getElementById('btn-capsule-tools');
    const capsuleToolsPopover = document.getElementById('capsule-tools-popover');
    const fileInput = document.getElementById('chat-file-input');

    if (btnCapsuleTools && capsuleToolsPopover) {
      btnCapsuleTools.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = capsuleToolsPopover.classList.toggle('active');
        btnCapsuleTools.classList.toggle('active-popover', isOpen);
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('#capsule-tools-group')) {
          capsuleToolsPopover.classList.remove('active');
          btnCapsuleTools.classList.remove('active-popover');
        }
      });
    }

    // 1. Tải lên tệp / ảnh
    const toolItemUpload = document.getElementById('tool-item-upload');
    const btnAttach = document.getElementById('btn-attach-image');
    const triggerFilePicker = () => {
      if (capsuleToolsPopover) capsuleToolsPopover.classList.remove('active');
      if (btnCapsuleTools) btnCapsuleTools.classList.remove('active-popover');
      if (fileInput) fileInput.click();
    };

    if (toolItemUpload) toolItemUpload.addEventListener('click', triggerFilePicker);
    if (btnAttach) btnAttach.addEventListener('click', triggerFilePicker);

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.attachFile(e.target.files[0]);
        }
      });
    }

    // 2. Tra cứu Web
    const toolItemWeb = document.getElementById('tool-item-web');
    if (toolItemWeb) {
      toolItemWeb.addEventListener('click', () => this.toggleTool('web'));
    }

    // 3. Deep Research
    const toolItemResearch = document.getElementById('tool-item-research');
    if (toolItemResearch) {
      toolItemResearch.addEventListener('click', () => this.toggleTool('research'));
    }

    // 4. Tư duy sâu (Thinking)
    const toolItemThinking = document.getElementById('tool-item-thinking');
    if (toolItemThinking) {
      toolItemThinking.addEventListener('click', () => this.toggleTool('thinking'));
    }

    // Nút gỡ tệp đính kèm
    const btnRemoveAttach = document.getElementById('btn-remove-attachment');
    if (btnRemoveAttach) {
      btnRemoveAttach.addEventListener('click', () => this.clearAttachedFile());
    }

    // Quick Chips & Sidebar Prompts
    document.querySelectorAll('.quick-prompt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-prompt') || btn.textContent.trim();
        this.sendPrompt(text);
      });
    });

    // Voice recognition button
    const btnVoice = document.getElementById('btn-voice-input');
    if (btnVoice) {
      btnVoice.addEventListener('click', () => {
        if (window.AisaVoice) window.AisaVoice.toggleSpeechToText();
      });
    }

    // Ambience buttons
    document.querySelectorAll('.btn-ambient-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.AisaVoice) {
          const isPlaying = window.AisaVoice.toggleAmbientAudio();
          document.querySelectorAll('.btn-ambient-toggle').forEach(b => b.classList.toggle('active', isPlaying));
          const waveVis = document.getElementById('ambient-visualizer');
          if (waveVis) waveVis.classList.toggle('playing', isPlaying);
        }
      });
    });

    // Sidebar Toggles & Mobile Drawer
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const sidebarLeft = document.getElementById('sanctuary-sidebar-left');
    const mobileOverlay = document.getElementById('mhent-aisa-overlay');

    // Phục hồi trạng thái sidebar đã lưu trên desktop
    if (sidebarLeft && window.innerWidth > 900) {
      const isSavedCollapsed = localStorage.getItem('aisa_sidebar_collapsed') === '1';
      sidebarLeft.classList.toggle('collapsed', isSavedCollapsed);
    }

    const toggleMobileLeftDrawer = (force) => {
      if (!sidebarLeft) return;
      if (window.innerWidth <= 900) {
        const next = typeof force === 'boolean' ? force : !sidebarLeft.classList.contains('open-mobile');
        sidebarLeft.classList.toggle('open-mobile', next);
        if (mobileOverlay) mobileOverlay.classList.toggle('show', next);
      } else {
        const isCollapsed = sidebarLeft.classList.toggle('collapsed');
        localStorage.setItem('aisa_sidebar_collapsed', isCollapsed ? '1' : '0');
      }
    };

    if (btnToggleSidebar) {
      btnToggleSidebar.addEventListener('click', () => toggleMobileLeftDrawer());
    }

    const btnCloseSidebarMobile = document.getElementById('btn-close-sidebar-mobile');
    if (btnCloseSidebarMobile) {
      btnCloseSidebarMobile.addEventListener('click', () => toggleMobileLeftDrawer(false));
    }

    if (mobileOverlay) {
      mobileOverlay.addEventListener('click', () => {
        toggleMobileLeftDrawer(false);
      });
    }

    // Auto-close drawer on mobile when clicking session or new session
    if (sidebarLeft) {
      sidebarLeft.addEventListener('click', (e) => {
        if (window.innerWidth <= 900) {
          if (e.target.closest('.btn-session-options, .btn-delete-session, .btn-clear-search, .sidebar-search-box, .session-context-menu')) {
            return;
          }
          if (e.target.closest('.sidebar-session-item, .session-item, .btn-new-session, .sidebar-prompt-item')) {
            setTimeout(() => toggleMobileLeftDrawer(false), 200);
          }
        }
      });
    }

    // 1. Sidebar Session Search Filter
    const searchInput = document.getElementById('sidebar-session-search');
    const btnClearSearch = document.getElementById('btn-clear-session-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (btnClearSearch) btnClearSearch.style.display = val ? 'inline-block' : 'none';
        this.renderSessionsList(val);
      });
    }
    if (btnClearSearch) {
      btnClearSearch.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          btnClearSearch.style.display = 'none';
          this.renderSessionsList('');
          searchInput.focus();
        }
      });
    }

    // 2. Sidebar Quick Nav: Media & Vision Hub
    const btnNavMedia = document.getElementById('btn-nav-media');
    if (btnNavMedia) {
      btnNavMedia.addEventListener('click', () => {
        this.openMediaGalleryModal();
      });
    }
    const btnCloseMedia = document.getElementById('btn-close-media-gallery');
    const modalMedia = document.getElementById('modal-media-gallery');
    if (btnCloseMedia && modalMedia) {
      btnCloseMedia.addEventListener('click', () => {
        modalMedia.style.display = 'none';
        modalMedia.classList.remove('active');
      });
      modalMedia.addEventListener('click', (e) => {
        if (e.target === modalMedia) {
          modalMedia.style.display = 'none';
          modalMedia.classList.remove('active');
        }
      });
    }

    // 3. Sidebar Quick Nav: Memory Bank
    const btnNavMemory = document.getElementById('btn-nav-memory');
    if (btnNavMemory) {
      btnNavMemory.addEventListener('click', () => {
        const memBtn = document.getElementById('btn-open-memory');
        if (memBtn) memBtn.click();
      });
    }

    // 4. Sidebar Bottom Tools: Gear & Cloud & User Footer
    const btnSidebarGear = document.getElementById('btn-sidebar-gear');
    if (btnSidebarGear) {
      btnSidebarGear.addEventListener('click', () => {
        const setBtn = document.getElementById('btn-open-settings');
        if (setBtn) setBtn.click();
      });
    }

    const btnSidebarCloudSync = document.getElementById('btn-sidebar-cloud-sync');
    if (btnSidebarCloudSync) {
      btnSidebarCloudSync.addEventListener('click', () => {
        const syncBtn = document.getElementById('btn-cloud-sync');
        if (syncBtn) syncBtn.click();
      });
    }

    const sfooterUserBtn = document.getElementById('sfooter-user-btn');
    if (sfooterUserBtn) {
      sfooterUserBtn.addEventListener('click', () => {
        const userBadge = document.getElementById('user-badge-inner');
        if (userBadge) userBadge.click();
      });
    }

    // Mobile Bottom Navigation Bar Controls
    const bottomNavItems = document.querySelectorAll('.aisa-nav-item');
    const scopePickerModal = document.getElementById('modal-scope-picker');
    const btnCloseScopePicker = document.getElementById('btn-close-scope-picker');

    bottomNavItems.forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.getAttribute('data-tab');

        if (tab === 'chat') {
          bottomNavItems.forEach(b => b.classList.remove('active'));
          item.classList.add('active');
          toggleMobileLeftDrawer(false);
          const messagesWrap = document.getElementById('chat-messages-wrap');
          if (messagesWrap) messagesWrap.scrollTo({ top: messagesWrap.scrollHeight, behavior: 'smooth' });
        } else if (tab === 'harmony') {
          bottomNavItems.forEach(b => b.classList.remove('active'));
          item.classList.add('active');
          this.setMode('harmony');
          toggleMobileLeftDrawer(false);
        } else if (tab === 'echo') {
          bottomNavItems.forEach(b => b.classList.remove('active'));
          item.classList.add('active');
          this.setMode('echo');
          toggleMobileLeftDrawer(false);
        } else if (tab === 'scope') {
          if (scopePickerModal) scopePickerModal.classList.add('show');
        } else if (tab === 'menu') {
          toggleMobileLeftDrawer();
        }
      });
    });

    // Scope Picker Modal Options
    if (scopePickerModal) {
      scopePickerModal.addEventListener('click', (e) => {
        if (e.target === scopePickerModal) scopePickerModal.classList.remove('show');
      });

      scopePickerModal.querySelectorAll('.scope-picker-option').forEach(opt => {
        opt.addEventListener('click', () => {
          const scope = opt.getAttribute('data-scope');
          this.setScope(scope);
          scopePickerModal.classList.remove('show');
        });
      });
    }

    if (btnCloseScopePicker && scopePickerModal) {
      btnCloseScopePicker.addEventListener('click', () => {
        scopePickerModal.classList.remove('show');
      });
    }

    // Modal controls
    this.bindModal('btn-open-memory', 'modal-memory', 'btn-close-memory');
    this.bindModal('btn-quick-open-vault', 'modal-memory', 'btn-close-memory');
    this.bindModal('btn-open-vision', 'modal-vision', 'btn-close-vision');
    this.bindModal('btn-open-settings', 'modal-settings', 'btn-close-settings');

    // Add Fact in Memory
    const formFact = document.getElementById('form-add-fact');
    if (formFact) {
      formFact.addEventListener('submit', (e) => {
        e.preventDefault();
        const factInput = document.getElementById('input-new-fact');
        const catSelect = document.getElementById('select-fact-category');
        if (factInput && factInput.value.trim() && window.AisaMemory) {
          window.AisaMemory.addFact(factInput.value.trim(), catSelect.value);
          factInput.value = '';
        }
      });
    }

    // Quick Add Fact from Right Sidebar
    const quickAddForm = document.getElementById('form-quick-add-fact');
    if (quickAddForm) {
      quickAddForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('input-sidebar-fact');
        if (input && input.value.trim() && window.AisaMemory) {
          window.AisaMemory.addFact(input.value.trim(), 'identity');
          input.value = '';
        }
      });
    }

    // Gemini API Key in Settings
    const inputGeminiKey = document.getElementById('input-gemini-key');
    const btnSaveGeminiKey = document.getElementById('btn-save-gemini-key');
    if (inputGeminiKey) {
      inputGeminiKey.value = localStorage.getItem(window.AISA_CONFIG.STORAGE.GEMINI_KEY) || '';
    }
    if (btnSaveGeminiKey && inputGeminiKey) {
      btnSaveGeminiKey.addEventListener('click', async () => {
        const key = inputGeminiKey.value.trim();
        if (key) {
          localStorage.setItem(window.AISA_CONFIG.STORAGE.GEMINI_KEY, key);
          await window.AisaDialog.alert({
            title: 'Đã Lưu Gemini Key',
            message: 'AISA sẽ chạy trực tiếp mô hình Gemini Multimodal siêu tốc độ!',
            icon: '✨',
            okText: 'Tuyệt Vời'
          });
        } else {
          localStorage.removeItem(window.AISA_CONFIG.STORAGE.GEMINI_KEY);
          await window.AisaDialog.alert({
            title: 'Đã Xóa Gemini Key',
            message: 'AISA sẽ quay lại sử dụng Cloudflare Backend mặc định.',
            icon: '⚙️',
            okText: 'Đã Hiểu'
          });
        }
      });
    }

    // Reset All Data button in Settings Modal
    const btnResetAll = document.getElementById('btn-reset-all-data');
    if (btnResetAll) {
      btnResetAll.addEventListener('click', async () => {
        const ok = await window.AisaDialog.confirm({
          title: 'Đặt Lại Toàn Bộ Dữ Liệu',
          message: 'Cậu có chắc muốn xóa sạch toàn bộ phiên chat và cài đặt trên thiết bị này không?',
          submessage: 'Ký ức đã lưu trên Edge D1 SQLite sẽ không bị ảnh hưởng.',
          icon: '⚠️',
          confirmText: 'Đặt Lại',
          cancelText: 'Hủy Bỏ',
          danger: true
        });
        if (ok) {
          localStorage.clear();
          location.reload();
        }
      });
    }

    // New Session Button (Quay về màn hình chào đón Intro ban đầu, URL /)
    const btnNewSession = document.getElementById('btn-new-session');
    if (btnNewSession) {
      btnNewSession.addEventListener('click', () => {
        this.openNewChatIntro(true);
      });
    }

    // Cloud Sync Buttons (Đồng bộ đám mây đa thiết bị)
    const btnCloudSync = document.getElementById('btn-cloud-sync');
    if (btnCloudSync) {
      btnCloudSync.addEventListener('click', () => {
        this.syncFromCloud(false);
      });
    }

    const btnSidebarSync = document.getElementById('btn-sync-cloud');
    if (btnSidebarSync) {
      btnSidebarSync.addEventListener('click', (e) => {
        e.stopPropagation();
        this.syncFromCloud(false);
      });
    }

    // Clear Chat Button (In Stream Top Bar)
    const btnClear = document.getElementById('btn-clear-chat');
    if (btnClear) {
      btnClear.addEventListener('click', async () => {
        const confirmed = await window.AisaDialog.confirm({
          title: 'Dọn Dẹp Phiên Chat',
          message: 'Cậu có chắc muốn dọn sạch cuộc trò chuyện của phiên này không nè?',
          submessage: 'Ký ức dài hạn trên Edge D1 SQLite vẫn được giữ an toàn!',
          icon: '🌸',
          confirmText: 'Dọn Sạch',
          cancelText: 'Giữ Lại',
          danger: true
        });

        if (confirmed) {
          this.state.messages = this.generateWelcomeMessages();
          this.saveState();
          this.renderMessages();
          this.renderSessionsList();
        }
      });
    }
  },

  async attachFile(file) {
    if (!file) return;

    const isImg = file.type.startsWith('image/');
    const fileName = file.name || (isImg ? 'image.png' : 'document.txt');
    const fileSizeStr = file.size > 1024 * 1024 
      ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
      : Math.round(file.size / 1024) + ' KB';

    // Xác định icon phù hợp với loại tệp
    let icon = '📄';
    const lowerName = fileName.toLowerCase();
    if (isImg) icon = '🖼️';
    else if (lowerName.endsWith('.pdf')) icon = '📕';
    else if (lowerName.endsWith('.csv') || lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) icon = '📊';
    else if (lowerName.endsWith('.doc') || lowerName.endsWith('.docx')) icon = '📘';
    else if (lowerName.endsWith('.txt') || lowerName.endsWith('.md')) icon = '📝';
    else if (lowerName.endsWith('.json') || lowerName.endsWith('.js') || lowerName.endsWith('.ts') || lowerName.endsWith('.py') || lowerName.endsWith('.html') || lowerName.endsWith('.css') || lowerName.endsWith('.sql')) icon = '💻';

    const previewBox = document.getElementById('chat-attached-preview');
    const thumb = document.getElementById('attached-img-thumb');
    const docIcon = document.getElementById('attached-doc-icon');
    const nameEl = document.getElementById('attached-img-name');
    const sizeEl = document.getElementById('attached-img-size');

    if (nameEl) nameEl.textContent = fileName;
    if (sizeEl) sizeEl.textContent = fileSizeStr;

    if (isImg) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.state.pendingImage = e.target.result;
        this.state.pendingImageName = fileName;
        this.state.pendingFile = {
          name: fileName,
          size: file.size,
          sizeStr: fileSizeStr,
          type: file.type,
          isImage: true,
          base64: e.target.result,
          icon: '🖼️'
        };

        if (thumb) {
          thumb.src = e.target.result;
          thumb.style.display = 'block';
        }
        if (docIcon) docIcon.style.display = 'none';
        if (previewBox) previewBox.style.display = 'flex';
      };
      reader.readAsDataURL(file);
    } else {
      // Tệp tài liệu, code, hoặc PDF
      this.state.pendingImage = null;
      this.state.pendingImageName = '';

      if (thumb) thumb.style.display = 'none';
      if (docIcon) {
        docIcon.textContent = icon;
        docIcon.style.display = 'inline-block';
      }

      // Đọc nội dung tệp (nếu là văn bản/code/json/csv/markdown)
      const isTextReadable = file.type.startsWith('text/') || 
        ['.txt', '.md', '.json', '.csv', '.js', '.ts', '.py', '.html', '.css', '.sql', '.toml', '.yaml', '.yml'].some(ext => lowerName.endsWith(ext));

      if (isTextReadable) {
        const textReader = new FileReader();
        textReader.onload = (e) => {
          this.state.pendingFile = {
            name: fileName,
            size: file.size,
            sizeStr: fileSizeStr,
            type: file.type,
            isImage: false,
            isText: true,
            icon: icon,
            textContent: e.target.result
          };
          if (previewBox) previewBox.style.display = 'flex';
        };
        textReader.readAsText(file);
      } else {
        // Tệp nhị phân như PDF
        const dataReader = new FileReader();
        dataReader.onload = (e) => {
          this.state.pendingFile = {
            name: fileName,
            size: file.size,
            sizeStr: fileSizeStr,
            type: file.type || 'application/octet-stream',
            isImage: false,
            isPdf: lowerName.endsWith('.pdf'),
            icon: icon,
            base64: e.target.result
          };
          if (previewBox) previewBox.style.display = 'flex';
        };
        dataReader.readAsDataURL(file);
      }
    }
  },

  clearAttachedFile() {
    this.state.pendingImage = null;
    this.state.pendingImageName = '';
    this.state.pendingFile = null;
    const previewBox = document.getElementById('chat-attached-preview');
    if (previewBox) previewBox.style.display = 'none';
    const thumb = document.getElementById('attached-img-thumb');
    if (thumb) { thumb.src = ''; thumb.style.display = 'none'; }
    const fileInput = document.getElementById('chat-file-input');
    if (fileInput) fileInput.value = '';
  },

  // Giữ phương thức tương thích ngược
  async attachImageFile(file) {
    return this.attachFile(file);
  },

  clearAttachedImage() {
    this.clearAttachedFile();
  },

  bindModal(openBtnId, modalId, closeBtnId) {
    const openBtn = document.getElementById(openBtnId);
    const modal = document.getElementById(modalId);
    const closeBtn = document.getElementById(closeBtnId);

    if (openBtn && modal) {
      openBtn.addEventListener('click', () => {
        modal.classList.add('active');
        if (modalId === 'modal-memory' && window.AisaMemory) {
          window.AisaMemory.refreshMemories();
        }
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    }
  },

  toggleTool(toolName) {
    if (toolName === 'web') {
      this.state.isWebSearch = !this.state.isWebSearch;
      if (this.state.isWebSearch) {
        this.showToast('Đã kích hoạt Tra cứu Web! 🌐', '🌐');
      }
    } else if (toolName === 'research') {
      this.state.isDeepResearch = !this.state.isDeepResearch;
      if (this.state.isDeepResearch) {
        this.showToast('Đã kích hoạt Deep Research đa nguồn! 🧭', '🧭');
      }
    } else if (toolName === 'thinking') {
      this.state.isThinking = !this.state.isThinking;
      if (this.state.isThinking) {
        this.showToast('Đã kích hoạt Tư duy sâu (Step-by-step)! 💡', '💡');
      }
    }

    this.syncToolsUI();
  },

  syncToolsUI() {
    const input = document.getElementById('chat-input');
    const inputCapsule = document.getElementById('gemini-input-capsule');

    // 1. Cập nhật popover items
    const itemWeb = document.getElementById('tool-item-web');
    const statusWeb = document.getElementById('status-popover-web');
    if (itemWeb) itemWeb.classList.toggle('active', this.state.isWebSearch);
    if (statusWeb) statusWeb.textContent = this.state.isWebSearch ? 'Bật' : 'Tắt';

    const itemResearch = document.getElementById('tool-item-research');
    const statusResearch = document.getElementById('status-popover-research');
    if (itemResearch) itemResearch.classList.toggle('active', this.state.isDeepResearch);
    if (statusResearch) statusResearch.textContent = this.state.isDeepResearch ? 'Bật' : 'Tắt';

    const itemThinking = document.getElementById('tool-item-thinking');
    const statusThinking = document.getElementById('status-popover-thinking');
    if (itemThinking) itemThinking.classList.toggle('active', this.state.isThinking);
    if (statusThinking) statusThinking.textContent = this.state.isThinking ? 'Bật' : 'Tắt';

    // 2. Cập nhật capsule styles & placeholder
    if (inputCapsule) {
      inputCapsule.classList.toggle('deep-research-active', this.state.isDeepResearch);
    }
    if (input) {
      input.placeholder = this.state.isDeepResearch
        ? 'Nhập chủ đề cần nghiên cứu sâu đa tầng cùng AISA...'
        : 'Nhập câu hỏi hoặc tâm sự cùng AISA...';
    }

    // 3. Render active pills inside capsule
    const pillsContainer = document.getElementById('capsule-active-pills');
    if (pillsContainer) {
      let html = '';
      if (this.state.isWebSearch) {
        html += `<span class="capsule-pill" onclick="window.AisaApp.toggleTool('web')" title="Nhấp để tắt">🌐 Web <span class="capsule-pill-close">✕</span></span>`;
      }
      if (this.state.isDeepResearch) {
        html += `<span class="capsule-pill pill-research" onclick="window.AisaApp.toggleTool('research')" title="Nhấp để tắt">🧭 Deep Research <span class="capsule-pill-close">✕</span></span>`;
      }
      if (this.state.isThinking) {
        html += `<span class="capsule-pill pill-thinking" onclick="window.AisaApp.toggleTool('thinking')" title="Nhấp để tắt">💡 Tư duy sâu <span class="capsule-pill-close">✕</span></span>`;
      }
      pillsContainer.innerHTML = html;
    }

    // 4. Đồng bộ các legacy badges nếu có
    const badgeResearch = document.getElementById('badge-deep-research');
    if (badgeResearch) badgeResearch.textContent = this.state.isDeepResearch ? 'Bật' : 'Tắt';
    const badgeWeb = document.getElementById('badge-web-search');
    if (badgeWeb) badgeWeb.textContent = this.state.isWebSearch ? 'Bật' : 'Tắt';
    const badgeThinking = document.getElementById('badge-thinking');
    if (badgeThinking) badgeThinking.textContent = this.state.isThinking ? 'Bật' : 'Tắt';
  },

  setMode(mode, save = true) {
    this.state.mode = mode;
    if (save) this.saveState();
    this.updateActivePersonaBadges();

    // Set persona aura attribute on body and stage for inward border glow
    document.body.setAttribute('data-aisa-mode', mode);
    const stage = document.querySelector('.sanctuary-stage') || document.querySelector('.main-content');
    if (stage) stage.setAttribute('data-active-mode', mode);

    // Synchronize mode pills active state
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });

    // Synchronize companion persona cards inside modal
    document.querySelectorAll('.companion-persona-card').forEach(card => {
      const isMatch = card.getAttribute('data-companion') === mode;
      card.classList.toggle('active', isMatch);
      const check = card.querySelector('.companion-check');
      if (check) check.textContent = isMatch ? '✓' : '';
    });

    this.updateModelBadge();
  },

  updateModelBadge() {
    const currentModelName = document.getElementById('current-model-name');
    if (!currentModelName) return;
    const modelId = window.AISA_CONFIG.MODEL || 'aisa-v1';
    const mode = this.state.mode || 'duo';
    const modeNames = {
      duo: 'Song Hành',
      harmony: 'Harmony',
      echo: 'Echo'
    };
    const modelLabels = {
      'aisa-v1': 'AISA v1',
      'aisa-scholar-v1': 'AISA Scholar v1',
      'aisa-pro-v1': 'AISA Pro v1'
    };
    const modelLabel = modelLabels[modelId] || modelId;
    currentModelName.textContent = `${modelLabel} • ${modeNames[mode] || 'Song Hành'}`;
  },

  setScope(scope) {
    this.state.scope = scope;
    this.saveState();
    this.updateScopeBadge();
  },

  updateScopeBadge() {
    const scopeNames = {
      personal: "💖 Sanctuary (Cá nhân & Tâm sự)",
      workspace: "💼 Workspace (Công việc & Lịch trình)",
      study: "📚 Study (Học ngoại ngữ & Tri thức)",
      portal: "🌌 Portal (Vũ trụ MHEnt Universe)"
    };
    const badge = document.getElementById('current-scope-label');
    if (badge) badge.textContent = scopeNames[this.state.scope] || scopeNames.personal;
  },

  updateActivePersonaBadges() {
    const hCard = document.getElementById('persona-card-harmony');
    const eCard = document.getElementById('persona-card-echo');
    const mode = this.state.mode;

    if (hCard) hCard.classList.toggle('dimmed', mode === 'echo');
    if (eCard) eCard.classList.toggle('dimmed', mode === 'harmony');
  },

  updateGreeting() {
    const el = document.getElementById('sanctuary-greeting-time');
    if (!el) return;

    const hour = new Date().getHours();
    let text = "🌸 Harmony: Chào buổi sáng an yên nè! • 😈 Echo: Dậy vươn vai vào việc thôi!";
    if (hour >= 12 && hour < 18) {
      text = "🌸 Harmony: Buổi chiều tập trung nha cậu • 😈 Echo: Đừng có lén lướt mạng xã hội đấy!";
    } else if (hour >= 18 && hour < 22) {
      text = "🌸 Harmony: Buổi tối thư thái nhé cậu • 😈 Echo: Xong việc hôm nay chưa nào?";
    } else if (hour >= 22 || hour < 5) {
      text = "🌸 Harmony: Đêm muộn rồi, nhớ ngủ sớm nha... • 😈 Echo: Thức khuya mắt gấu trúc đấy!";
    }

    el.textContent = text;
  },

  getCurrentTimeString() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  },

  getUserDisplayName() {
    const isOrgOrInvalid = (str) => {
      if (!str || typeof str !== 'string') return true;
      const s = str.trim();
      return !s || s.includes('Entertainment') || s.includes('Co.,') || s.includes('Ltd') || s.length > 22;
    };

    const custom = localStorage.getItem('aisa_user_display_name');
    if (custom && !isOrgOrInvalid(custom)) return custom.trim();

    if (window.AisaAuth && window.AisaAuth.currentUser && window.AisaAuth.currentUser.name) {
      const authName = window.AisaAuth.currentUser.name;
      if (!isOrgOrInvalid(authName)) return authName.trim();
    }

    if (window.AISA_CONFIG && window.AISA_CONFIG.USER && window.AISA_CONFIG.USER.name) {
      const cfgName = window.AISA_CONFIG.USER.name;
      if (!isOrgOrInvalid(cfgName)) return cfgName.trim();
    }

    return "Master Yurika";
  },

  async promptChangeUserName() {
    const currentName = this.getUserDisplayName();
    const newName = await window.AisaDialog.prompt({
      title: "Đổi Tên Gọi Thân Thương",
      message: "Nhập tên hiển thị cậu muốn AISA gọi nè:",
      submessage: "Tên này sẽ được Harmony và Echo dùng để xưng hô thân mật cùng cậu trong suốt Sanctuary.",
      defaultValue: currentName,
      placeholder: "Ví dụ: Haruto, Yurika, Sakura...",
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
      confirmText: "Lưu Tên Mới",
      cancelText: "Hủy Bỏ"
    });

    if (newName !== null && newName.trim() && newName.trim() !== currentName) {
      let trimmed = newName.trim();
      if (trimmed.length > 20) {
        trimmed = trimmed.substring(0, 20);
      }
      localStorage.setItem('aisa_user_display_name', trimmed);
      if (window.AISA_CONFIG && window.AISA_CONFIG.USER) {
        window.AISA_CONFIG.USER.name = trimmed;
      }
      if (window.AisaAuth && window.AisaAuth.currentUser) {
        window.AisaAuth.currentUser.name = trimmed;
      }
      this.renderMessages();
      this.showToast(`Đã đổi tên xưng hô thành "${trimmed}" ✨`, '🌸');
    }
  },

  renderMessages() {
    const container = document.getElementById('chat-messages-wrap');
    if (!container) return;

    const hasUserMessages = Array.isArray(this.state.messages) && this.state.messages.some(m => m.role === 'user');
    const userName = this.getUserDisplayName();

    // 1. Trạng thái bắt đầu / mới tạo: Render Hero Greeting với phong cách Sanctuary MHEnt Universe sang trọng
    if (!hasUserMessages) {
      container.innerHTML = `
        <div class="gemini-hero-greeting-container sanctuary-hero-aura">
          <div class="gemini-hero-greeting" id="gemini-hero-greeting">
            <h1 class="gemini-gradient-headline">
              <span class="gradient-text">Xin chào, <span id="hero-user-name" class="editable-user-tag" title="Nhấp để đổi tên xưng hô">${this.escapeHtml(userName)} <span class="edit-name-badge">✎</span></span></span>
            </h1>
            <p class="gemini-sub-headline">AISA Sanctuary luôn sẵn sàng lắng nghe và đồng hành cùng cậu hôm nay ✨</p>
            
            <div class="gemini-prompt-cards-grid sanctuary-cards-grid">
              <!-- Card 1: Harmony Chữa lành -->
              <div class="gemini-prompt-card sanctuary-card card-harmony quick-prompt-btn" data-prompt="Cậu ơi hôm nay em thấy hơi mệt mỏi và áp lực bài vở...">
                <div class="gemini-card-text">Tâm sự cùng Harmony khi thấy mệt mỏi hay áp lực bài vở...</div>
                <div class="sanctuary-card-icon-box icon-box-harmony">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4C10.5 1.5 7 1.5 5 4C3 6.5 4 10 7 12C4 12 1 15 2 18.5C3 22 7.5 21 10 19C10.5 21.5 13.5 21.5 14 19C16.5 21 21 22 22 18.5C23 15 20 12 17 12C20 10 21 6.5 19 4C17 1.5 13.5 1.5 12 4Z" fill="url(#lotusPinkGrad)"/>
                    <circle cx="12" cy="12" r="2.5" fill="#ffffff"/>
                    <defs>
                      <linearGradient id="lotusPinkGrad" x1="2" y1="2" x2="22" y2="21" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#f472b6"/>
                        <stop offset="1" stop-color="#fb7185"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              <!-- Card 2: Echo Cà khịa & Bóc phốt deadline -->
              <div class="gemini-prompt-card sanctuary-card card-echo quick-prompt-btn" data-prompt="Echo ơi, kiểm tra lỗi code và lên dây cót deadline cho tớ!">
                <div class="gemini-card-text">Nhờ Echo bóc mẽ lỗi code hoặc cà khịa deadline sấp mặt...</div>
                <div class="sanctuary-card-icon-box icon-box-echo">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4L7 9C9 7.2 10.5 6.8 12 6.8C13.5 6.8 15 7.2 17 9L20 4C18 1.5 15.5 0.8 12 0.8C8.5 0.8 6 1.5 4 4Z" fill="#a78bfa"/>
                    <rect x="4" y="8" width="16" height="13" rx="6.5" fill="url(#echoImpGrad)" stroke="#c084fc" stroke-width="1.2"/>
                    <circle cx="9" cy="14" r="1.6" fill="#ffffff"/>
                    <circle cx="15" cy="14" r="1.6" fill="#ffffff"/>
                    <path d="M9.5 17.5C10.5 19 13.5 19 14.5 17.5" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
                    <defs>
                      <linearGradient id="echoImpGrad" x1="4" y1="8" x2="20" y2="21" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#7c3aed"/>
                        <stop offset="1" stop-color="#a855f7"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              <!-- Card 3: Yume Tsukai Precure & Phối beat -->
              <div class="gemini-prompt-card sanctuary-card card-music quick-prompt-btn" data-prompt="Thảo luận ý tưởng kịch bản và phối beat nhạc cho Yume Tsukai Precure!">
                <div class="gemini-card-text">Phối beat và thảo luận kịch bản Yume Tsukai Precure!...</div>
                <div class="sanctuary-card-icon-box icon-box-music">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 18V5L20 3V16" stroke="url(#musicAmberGrad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="6" cy="18" r="3" fill="#f59e0b"/>
                    <circle cx="17" cy="16" r="3" fill="#ec4899"/>
                    <path d="M9 9L20 7" stroke="#ffffff" stroke-width="1.5"/>
                    <defs>
                      <linearGradient id="musicAmberGrad" x1="9" y1="3" x2="20" y2="18" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#f59e0b"/>
                        <stop offset="1" stop-color="#ec4899"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              <!-- Card 4: Ký ức dài hạn Edge D1 -->
              <div class="gemini-prompt-card sanctuary-card card-memory quick-prompt-btn" data-prompt="Hãy liệt kê lại những sở thích, dự án và ký ức của tớ mà cậu đã ghi nhớ.">
                <div class="gemini-card-text">Xem lại những gì AISA đã ghi nhớ dài hạn về tớ...</div>
                <div class="sanctuary-card-icon-box icon-box-memory">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="9" stroke="url(#memoryCyanGrad)" stroke-width="1.8"/>
                    <circle cx="12" cy="12" r="3" fill="#06b6d4"/>
                    <path d="M12 3V9M12 15V21M3 12H9M15 12H21" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/>
                    <circle cx="12" cy="3" r="1.5" fill="#ffffff"/>
                    <circle cx="21" cy="12" r="1.5" fill="#ffffff"/>
                    <circle cx="12" cy="21" r="1.5" fill="#ffffff"/>
                    <circle cx="3" cy="12" r="1.5" fill="#ffffff"/>
                    <defs>
                      <linearGradient id="memoryCyanGrad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#06b6d4"/>
                        <stop offset="1" stop-color="#3b82f6"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Gắn sự kiện đổi tên khi click vào tên user
      const nameTag = container.querySelector('#hero-user-name');
      if (nameTag) {
        nameTag.addEventListener('click', (e) => {
          e.stopPropagation();
          this.promptChangeUserName();
        });
      }

      // Gắn sự kiện click cho các gợi ý thẻ câu hỏi
      container.querySelectorAll('.quick-prompt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const text = btn.getAttribute('data-prompt') || btn.textContent.trim();
          this.sendPrompt(text);
        });
      });

      // Tuyệt đối không cuộn xuống dưới, giữ bố cục trọn vẹn và thư thái
      container.scrollTop = 0;
      return;
    }

    // 2. Khi đã có hội thoại thực tế
    container.innerHTML = `
      <div class="messages-inner-container">
        ${this.state.messages.map(m => {
          const isUser = m.role === 'user';
          if (isUser) {
            return `
              <div class="message-row user-row" id="${m.id}">
                <div class="message-bubble user-bubble">
                  <div class="bubble-meta">
                    <span class="sender-name">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;">
                        <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>
                      </svg>
                      ${this.escapeHtml(userName)}
                    </span>
                    <span class="message-time">${m.time}</span>
                  </div>
                  ${m.file && !m.image ? `
                    <div class="bubble-attached-file-card">
                      <div class="bubble-file-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                      </div>
                      <div class="bubble-file-details">
                        <div class="bubble-file-name">${this.escapeHtml(m.file.name)}</div>
                        <div class="bubble-file-size">${m.file.sizeStr || 'Tệp đính kèm'}</div>
                      </div>
                    </div>
                  ` : ''}
                  ${m.image ? `
                    <div class="bubble-attached-img-wrap">
                      <img src="${m.image}" class="bubble-attached-img" onclick="window.open('${m.image}', '_blank')" alt="Ảnh đính kèm" title="Nhấp để xem ảnh đầy đủ">
                    </div>
                  ` : ''}
                  ${m.text ? `<div class="bubble-text">${window.AisaMarkdown.format(m.text || '')}</div>` : ''}
                </div>
              </div>
            `;
          }

          const isHarmony = m.speaker === 'HARMONY';
          const personaAvatarSvg = isHarmony
            ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 4C10.5 1.5 7 1.5 5 4C3 6.5 4 10 7 12C4 12 1 15 2 18.5C3 22 7.5 21 10 19C10.5 21.5 13.5 21.5 14 19C16.5 21 21 22 22 18.5C23 15 20 12 17 12C20 10 21 6.5 19 4C17 1.5 13.5 1.5 12 4Z" fill="#f472b6"/><circle cx="12" cy="12" r="2.4" fill="#ffffff"/></svg>`
            : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 5L7.5 9C9 7.5 10.5 7 12 7C13.5 7 15 7.5 16.5 9L19 5C17 2.5 15 1.5 12 1.5C9 1.5 7 2.5 5 5Z" fill="#a78bfa"/><circle cx="12" cy="14" r="6.5" fill="#8b5cf6" fill-opacity="0.35" stroke="#a78bfa" stroke-width="1.4"/><circle cx="9.8" cy="13" r="1.3" fill="#ffffff"/><circle cx="14.2" cy="13" r="1.3" fill="#ffffff"/><path d="M10 16.5C10.8 17.5 13.2 17.5 14 16.5" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round"/></svg>`;

          const speakerBadgeHtml = isHarmony
            ? `<span style="display: inline-flex; align-items: center; gap: 4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 4C10.5 1.5 7 1.5 5 4C3 6.5 4 10 7 12C4 12 1 15 2 18.5C3 22 7.5 21 10 19C10.5 21.5 13.5 21.5 14 19C16.5 21 21 22 22 18.5C23 15 20 12 17 12C20 10 21 6.5 19 4C17 1.5 13.5 1.5 12 4Z" fill="#f472b6"/></svg> Harmony</span>`
            : `<span style="display: inline-flex; align-items: center; gap: 4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 5L7.5 9C9 7.5 10.5 7 12 7C13.5 7 15 7.5 16.5 9L19 5C17 2.5 15 1.5 12 1.5C9 1.5 7 2.5 5 5Z" fill="#a78bfa"/></svg> Echo</span>`;

          const bubbleClass = isHarmony ? 'harmony-bubble' : 'echo-bubble';
          const cleanText = window.AisaEngine ? window.AisaEngine.cleanReply(m.text) : m.text;

          return `
            <div class="message-row assistant-row ${isHarmony ? 'harmony-row' : 'echo-row'}" id="${m.id}">
              <div class="assistant-avatar ${isHarmony ? 'avt-harmony' : 'avt-echo'}">${personaAvatarSvg}</div>
              <div class="message-bubble ${bubbleClass}">
                <div class="bubble-meta">
                  <span class="sender-name ${isHarmony ? 'name-harmony' : 'name-echo'}">${speakerBadgeHtml}</span>
                  <span class="message-time">${m.time}</span>
                </div>
                ${m.isDeepResearch ? `
                  <div class="deep-research-badge">
                    <span class="badge-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
                      </svg>
                    </span>
                    <span class="badge-title">Deep Research Dossier</span>
                    <span class="badge-tag">Phân tích đa chiều MHEnt</span>
                  </div>
                ` : ''}
                <div class="bubble-text">${window.AisaMarkdown.format(cleanText)}</div>
                <div class="bubble-actions">
                  <button type="button" class="btn-bubble-action" onclick="window.AisaVoice.speak('${this.escapeQuotes(cleanText)}', '${m.speaker}')" title="Nghe giọng nói">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                  </button>
                  <button type="button" class="btn-bubble-action" onclick="navigator.clipboard.writeText('${this.escapeQuotes(cleanText)}')" title="Sao chép câu trả lời">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Re-bind prompt buttons inside container nếu có
    container.querySelectorAll('.quick-prompt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-prompt') || btn.textContent.trim();
        this.sendPrompt(text);
      });
    });

    container.scrollTop = container.scrollHeight;
  },

  escapeQuotes(str) {
    return String(str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' ');
  },

  escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  sendPrompt(text) {
    const input = document.getElementById('chat-input');
    if (input) {
      input.value = text;
      input.style.height = 'auto';
      this.handleSendMessage();
    }
  },

  async handleSendMessage() {
    if (this.state.isGenerating) return;

    const input = document.getElementById('chat-input');
    const userText = input ? input.value.trim() : '';
    const attachedFile = this.state.pendingFile;
    const imageToSend = this.state.pendingImage;
    const isDeepResearch = this.state.isDeepResearch;

    // Phải có ít nhất nội dung văn bản hoặc hình ảnh hoặc tệp đính kèm
    if (!userText && !imageToSend && !attachedFile) return;

    if (input) {
      input.value = '';
      input.style.height = 'auto';
    }

    // Xóa trạng thái preview sau khi đã lấy dữ liệu
    this.clearAttachedFile();

    // 1. Nếu chưa có phiên nào (đang ở màn hình chào mừng root), tạo phiên mới ngay khi gửi tin nhắn đầu tiên
    if (!this.state.currentSessionId) {
      const summaryText = userText || (attachedFile ? `Tệp: ${attachedFile.name}` : 'Hình ảnh');
      const cleanTitle = summaryText.length > 26 ? summaryText.slice(0, 26) + '...' : summaryText;
      const newSession = {
        id: 'session-' + Date.now(),
        title: cleanTitle || 'Cuộc trò chuyện',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        mode: this.state.mode,
        scope: this.state.scope,
        messages: []
      };
      this.state.sessions.unshift(newSession);
      this.state.currentSessionId = newSession.id;
      this.updateUrlRoute('/chat', { id: newSession.id });
    }

    // 2. Thêm tin nhắn user vào lịch sử
    const userMsg = {
      id: 'msg-' + Date.now(),
      role: 'user',
      time: this.getCurrentTimeString(),
      text: userText,
      image: imageToSend,
      file: attachedFile ? {
        name: attachedFile.name,
        sizeStr: attachedFile.sizeStr,
        icon: attachedFile.icon,
        isImage: attachedFile.isImage
      } : null,
      isDeepResearch: isDeepResearch
    };
    this.state.messages.push(userMsg);

    // Cập nhật tiêu đề phiên tự động theo nội dung câu hỏi đầu tiên
    const currentSession = this.state.sessions.find(s => s.id === this.state.currentSessionId);
    if (currentSession && (currentSession.title === 'Phiên trò chuyện mới' || currentSession.title === 'Trò chuyện cùng AISA')) {
      const summaryText = userText || (attachedFile ? `Tệp: ${attachedFile.name}` : 'Hình ảnh');
      const cleanTitle = summaryText.length > 26 ? summaryText.slice(0, 26) + '...' : summaryText;
      currentSession.title = cleanTitle || 'Cuộc trò chuyện';
    }

    this.saveState();
    this.renderSessionsList();
    this.renderMessages();

    // 2. Hiển thị Typing Indicator
    this.state.isGenerating = true;
    this.showTypingIndicator(userText, isDeepResearch);

    // Chuẩn bị nội dung gửi cho AI Engine
    let messageForAi = userText;
    if (attachedFile && attachedFile.isText && attachedFile.textContent) {
      const maxLen = 40000;
      let textSnippet = attachedFile.textContent;
      if (textSnippet.length > maxLen) {
        textSnippet = textSnippet.slice(0, maxLen) + '\n... [Nội dung đã được cắt bớt vì vượt quá giới hạn] ...';
      }
      messageForAi = `[TỆP ĐÍNH KÈM: ${attachedFile.name} (${attachedFile.sizeStr})]\n--- BẮT ĐẦU NỘI DUNG TỆP ---\n${textSnippet}\n--- KẾT THÚC NỘI DUNG TỆP ---\n\n${userText || 'Hãy phân tích, tóm tắt hoặc giải quyết bài toán/trả lời câu hỏi dựa trên tệp tài liệu này giúp tớ nhé!'}`;
    } else if (attachedFile && attachedFile.isPdf) {
      messageForAi = `[TỆP ĐÍNH KÈM PDF: ${attachedFile.name} (${attachedFile.sizeStr})]\n${userText || 'Hãy đọc và phân tích tệp tài liệu PDF này giúp tớ nhé!'}`;
    }

    try {
      const replies = await window.AisaEngine.chat(
        messageForAi,
        this.state.mode,
        this.state.scope,
        imageToSend,
        {
          deepResearch: isDeepResearch,
          webSearch: this.state.isWebSearch,
          thinking: this.state.isThinking,
          attachedFile: attachedFile
        }
      );

      this.hideTypingIndicator();

      if (replies && replies.length > 0) {
        replies.forEach((rep, idx) => {
          const clean = window.AisaEngine ? window.AisaEngine.cleanReply(rep.text) : rep.text;
          this.state.messages.push({
            id: 'msg-rep-' + (Date.now() + idx),
            role: 'assistant',
            speaker: rep.speaker,
            avatar: rep.avatar || (rep.speaker === 'HARMONY' ? '🌸' : '😈'),
            time: this.getCurrentTimeString(),
            text: clean,
            isDeepResearch: isDeepResearch
          });
        });
      } else {
        this.state.messages.push({
          id: 'msg-rep-' + Date.now(),
          role: 'assistant',
          speaker: 'HARMONY',
          avatar: '🌸',
          time: this.getCurrentTimeString(),
          text: `Dạ em đã ghi nhận yêu cầu của cậu rồi nà! Cậu cần em hỗ trợ thêm điều gì không? 🌸`,
          isDeepResearch: isDeepResearch
        });
      }

      this.saveState();
      this.renderSessionsList();
      this.renderMessages();
    } catch (e) {
      this.hideTypingIndicator();
      console.error(e);
      this.state.messages.push({
        id: 'msg-err-' + Date.now(),
        role: 'assistant',
        speaker: 'HARMONY',
        avatar: '🌸',
        time: this.getCurrentTimeString(),
        text: `⚠️ Đường truyền Neural Link bị gián đoạn một chút. Cậu thử gửi lại xem sao nha! 🌸`
      });
      this.renderMessages();
    } finally {
      this.state.isGenerating = false;
    }
  },

  showTypingIndicator(userText = '', isDeepResearch = false) {
    const container = document.querySelector('.messages-inner-container') || document.getElementById('chat-messages-wrap');
    if (!container) return;

    const lower = (userText || '').toLowerCase();
    const mentionsEcho = lower.includes('echo') || lower.includes('ếch cồ');
    const mentionsHarmony = lower.includes('harmony') || lower.includes('hà mòn');

    let avatar = '🌸😈';
    let label = isDeepResearch 
      ? '🧭 AISA đang tiến hành Deep Research, tổng hợp & phân tích đa tầng...'
      : 'Harmony & Echo đang cùng suy nghĩ...';

    if (!isDeepResearch) {
      if (this.state.mode === 'harmony' || (mentionsHarmony && !mentionsEcho)) {
        avatar = '🌸';
        label = mentionsHarmony ? 'Harmony đang suy nghĩ câu trả lời cho cậu... 🌸' : 'Harmony đang suy nghĩ... 🌸';
      } else if (this.state.mode === 'echo' || (mentionsEcho && !mentionsHarmony)) {
        avatar = '😈';
        label = mentionsEcho ? 'Echo đang suy nghĩ câu trả lời cho cậu... 😈' : 'Echo đang suy nghĩ... 😈';
      }
    }

    const typingEl = document.createElement('div');
    typingEl.id = 'typing-indicator-node';
    typingEl.className = 'message-row assistant-row typing-row';
    typingEl.innerHTML = `
      <div class="assistant-avatar" style="background: rgba(255,255,255,0.06); border: 1px solid var(--border-subtle);">${avatar}</div>
      <div class="typing-bubble" style="display: flex; align-items: center; gap: 8px;">
        <span class="typing-gemini-sparkle">✨</span>
        <span class="typing-text">${label}</span>
      </div>
    `;
    container.appendChild(typingEl);
    
    const wrap = document.getElementById('chat-messages-wrap');
    if (wrap) wrap.scrollTop = wrap.scrollHeight;
  },

  hideTypingIndicator() {
    const el = document.getElementById('typing-indicator-node');
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  },

  showToast(message, icon = '🧠') {
    let container = document.querySelector('.aisa-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'aisa-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'aisa-toast';
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-text">${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 400);
    }, 4500);
  }
};

// Khởi chạy khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  window.AisaApp.init();
});
