/**
 * AISA COMPANION - MAIN APPLICATION CONTROLLER
 * Multi-Session Chat Hub & MHEnt Luxury Dialog System
 * Miyazaki Haruto Entertainment Co., Ltd. - Project MHEnt. Universe
 */

// ============================================================================
// 1. MHENT UNIVERSE LUXURY CUSTOM DIALOG & ALERT SYSTEM
// ============================================================================
window.AisaDialog = {
  confirm({
    title = "Xác Nhận",
    message = "Cậu có chắc chắn muốn thực hiện hành động này không?",
    submessage = "",
    icon = "🌸",
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
      const btnConfirm = document.getElementById('btn-dialog-confirm');
      const btnCancel = document.getElementById('btn-dialog-cancel');
      const btnClose = document.getElementById('btn-dialog-close-x');

      if (titleEl) titleEl.textContent = title;
      if (iconBadge) iconBadge.textContent = icon;
      if (iconCircle) iconCircle.textContent = icon;
      if (headEl) headEl.textContent = message;
      if (subEl) {
        subEl.textContent = submessage;
        subEl.style.display = submessage ? 'block' : 'none';
      }

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
    icon = "✨",
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
      const btnConfirm = document.getElementById('btn-dialog-confirm');
      const btnCancel = document.getElementById('btn-dialog-cancel');
      const btnClose = document.getElementById('btn-dialog-close-x');

      if (titleEl) titleEl.textContent = title;
      if (iconBadge) iconBadge.textContent = icon;
      if (iconCircle) iconCircle.textContent = icon;
      if (headEl) headEl.textContent = message;
      if (subEl) {
        subEl.textContent = submessage;
        subEl.style.display = submessage ? 'block' : 'none';
      }

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
    pendingImageName: ''
  },

  init() {
    this.loadState();
    this.bindEvents();
    this.updateGreeting();
    this.renderSessionsList();
    this.renderMessages();

    // Khởi tạo Cổng Xác Thực Độc Quyền (Gatekeeper)
    if (window.AisaAuth) {
      window.AisaAuth.init();
    }

    // Khởi tạo các module vệ tinh
    if (window.AisaVoice) window.AisaVoice.init();
    if (window.AisaMemory) window.AisaMemory.init();
    if (window.AisaVision) window.AisaVision.init();

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
          this.state.sessions = parsed.map(s => ({
            ...s,
            messages: (s.messages || []).map(m => {
              if (m.role === 'assistant' && m.text) {
                const clean = window.AisaEngine ? window.AisaEngine.cleanReply(m.text) : m.text;
                return { ...m, text: clean };
              }
              return m;
            })
          }));
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

        const initialMsgs = oldMsgs.length > 0 ? oldMsgs : this.generateWelcomeMessages();
        const initialTitle = this.deriveSessionTitle(initialMsgs) || 'Cuộc trò chuyện chính';
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
        this.state.currentSessionId = defaultSession.id;
      }

      // Xác định phiên hoạt động hiện tại
      let current = this.state.sessions.find(s => s.id === activeId);
      if (!current) {
        current = this.state.sessions[0];
      }
      this.state.currentSessionId = current.id;
      this.state.messages = current.messages || [];

      // Nạp mode và scope
      const savedMode = localStorage.getItem(config.STORAGE.ACTIVE_MODE);
      if (savedMode) this.state.mode = savedMode;

      const savedScope = localStorage.getItem(config.STORAGE.ACTIVE_SCOPE);
      if (savedScope) this.state.scope = savedScope;

    } catch (e) {
      console.warn('Could not load saved state:', e);
      if (this.state.sessions.length === 0) {
        this.createNewSession('Trò chuyện cùng AISA', false);
      }
    }
  },

  saveState() {
    try {
      const config = window.AISA_CONFIG;
      // Cập nhật messages của session hiện tại vào sessions array
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
      localStorage.setItem(config.STORAGE.ACTIVE_SESSION, this.state.currentSessionId || '');
      localStorage.setItem(config.STORAGE.HISTORY, JSON.stringify(this.state.messages));
      localStorage.setItem(config.STORAGE.ACTIVE_MODE, this.state.mode);
      localStorage.setItem(config.STORAGE.ACTIVE_SCOPE, this.state.scope);
    } catch (e) {}
  },

  // --------------------------------------------------------------------------
  // MULTI-SESSION CONTROLLER
  // --------------------------------------------------------------------------
  createNewSession(title = 'Phiên trò chuyện mới', shouldSave = true) {
    const welcomeMessages = this.generateWelcomeMessages();
    const newSession = {
      id: 'session-' + Date.now(),
      title: title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      mode: this.state.mode,
      scope: this.state.scope,
      messages: welcomeMessages
    };

    this.state.sessions.unshift(newSession);
    this.state.currentSessionId = newSession.id;
    this.state.messages = welcomeMessages;

    if (shouldSave) {
      this.saveState();
    }
    this.renderSessionsList();
    this.renderMessages();
  },

  switchSession(sessionId) {
    if (this.state.currentSessionId === sessionId) return;

    this.saveState();
    const target = this.state.sessions.find(s => s.id === sessionId);
    if (!target) return;

    this.state.currentSessionId = target.id;
    this.state.messages = target.messages || [];
    if (target.mode) {
      this.setMode(target.mode, false);
    }

    this.saveState();
    this.renderSessionsList();
    this.renderMessages();
  },

  async deleteSession(sessionId, e) {
    if (e) e.stopPropagation();

    const target = this.state.sessions.find(s => s.id === sessionId);
    if (!target) return;

    const confirmed = await window.AisaDialog.confirm({
      title: 'Xóa Phiên Trò Chuyện',
      message: `Cậu có chắc muốn xóa phiên "${target.title}" không nè?`,
      submessage: 'Toàn bộ nội dung của phiên này sẽ được dọn sạch khỏi thiết bị.',
      icon: '🗑️',
      confirmText: 'Xóa Phiên',
      cancelText: 'Giữ Lại',
      danger: true
    });

    if (!confirmed) return;

    this.state.sessions = this.state.sessions.filter(s => s.id !== sessionId);

    if (this.state.sessions.length === 0) {
      this.createNewSession('Trò chuyện cùng AISA', true);
      return;
    }

    if (this.state.currentSessionId === sessionId) {
      this.state.currentSessionId = this.state.sessions[0].id;
      this.state.messages = this.state.sessions[0].messages || [];
    }

    this.saveState();
    this.renderSessionsList();
    this.renderMessages();
  },

  renderSessionsList() {
    const container = document.getElementById('sidebar-sessions-list');
    const badge = document.getElementById('sessions-count-badge');
    if (badge) badge.textContent = this.state.sessions.length;
    if (!container) return;

    if (this.state.sessions.length === 0) {
      container.innerHTML = `<div class="sessions-empty-tip">Chưa có phiên chat nào. Bấm nút phía trên để tạo nhé! ✨</div>`;
      return;
    }

    container.innerHTML = this.state.sessions.map(s => {
      const isActive = s.id === this.state.currentSessionId;
      const timeStr = this.formatSessionTime(s.updatedAt || s.createdAt);
      const icon = s.mode === 'harmony' ? '🌸' : (s.mode === 'echo' ? '😈' : '💬');

      return `
        <div class="session-item ${isActive ? 'active' : ''}" onclick="window.AisaApp.switchSession('${s.id}')" title="${this.escapeQuotes(s.title)}">
          <div class="session-item-main">
            <span class="session-item-icon">${icon}</span>
            <div class="session-item-texts">
              <div class="session-item-title">${this.escapeHtml(s.title)}</div>
              <div class="session-item-meta">${timeStr} • ${(s.messages || []).length} tin</div>
            </div>
          </div>
          <button type="button" class="btn-delete-session" onclick="window.AisaApp.deleteSession('${s.id}', event)" title="Xóa phiên này">
            ✕
          </button>
        </div>
      `;
    }).join('');
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
    if (window.AISA_CONFIG && window.AISA_CONFIG.USER) {
      window.AISA_CONFIG.USER.name = user.name || "Master Yurika";
      window.AISA_CONFIG.USER.avatar = user.avatar || "👑";
    }
    this.updateGreeting();

    // Nếu phiên hiện tại chỉ có 2 tin nhắn khởi tạo mẫu, cá nhân hóa lời chào cho Master
    if (this.state.messages.length === 2 && this.state.messages[0].id.startsWith('msg-welcome')) {
      this.state.messages = this.generateWelcomeMessages();
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
            // Nạp trực tiếp vào phiên đầu tiên nếu phiên đó chỉ có tin chào mặc định
            const currentSession = this.state.sessions.find(s => s.id === this.state.currentSessionId);
            if (currentSession && (currentSession.messages.length <= 2 && !currentSession.messages.some(m => m.role === 'user'))) {
              currentSession.messages = restored;
              currentSession.title = this.deriveSessionTitle(restored) || 'Ký ức Edge D1';
              this.state.messages = restored;
            } else {
              // Hoặc tạo một phiên D1 riêng
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
            this.renderMessages();
          }
        }
      }
    } catch (e) {
      console.warn('[Restore History Notice]:', e);
    }
  },

  bindEvents() {
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

      // Hỗ trợ dán ảnh trực tiếp từ Clipboard (Ctrl + V)
      input.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
          if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
            const blob = items[i].getAsFile();
            this.attachImageFile(blob);
            break;
          }
        }
      });
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.handleSendMessage());
    }

    // Đính kèm hình ảnh (File Picker)
    const btnAttach = document.getElementById('btn-attach-image');
    const fileInput = document.getElementById('chat-file-input');
    if (btnAttach && fileInput) {
      btnAttach.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.attachImageFile(e.target.files[0]);
        }
      });
    }

    // Nút gỡ ảnh đính kèm
    const btnRemoveAttach = document.getElementById('btn-remove-attachment');
    if (btnRemoveAttach) {
      btnRemoveAttach.addEventListener('click', () => this.clearAttachedImage());
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

    // Sidebar Toggles
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const sidebarLeft = document.getElementById('sanctuary-sidebar-left');
    if (btnToggleSidebar && sidebarLeft) {
      btnToggleSidebar.addEventListener('click', () => {
        sidebarLeft.classList.toggle('collapsed');
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

    // New Session Button
    const btnNewSession = document.getElementById('btn-new-session');
    if (btnNewSession) {
      btnNewSession.addEventListener('click', () => {
        this.createNewSession();
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

  async attachImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      await window.AisaDialog.alert({
        title: 'Tệp Không Hợp Lệ',
        message: 'Vui lòng chọn hoặc dán tệp hình ảnh hợp lệ (PNG, JPG, WebP).',
        icon: '🖼️',
        okText: 'Đã Hiểu'
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      this.state.pendingImage = e.target.result;
      this.state.pendingImageName = file.name || 'image.png';

      const previewBox = document.getElementById('chat-attached-preview');
      const thumb = document.getElementById('attached-img-thumb');
      const nameEl = document.getElementById('attached-img-name');
      const sizeEl = document.getElementById('attached-img-size');

      if (thumb) thumb.src = e.target.result;
      if (nameEl) nameEl.textContent = file.name || 'Hình ảnh đính kèm';
      if (sizeEl) sizeEl.textContent = Math.round(file.size / 1024) + ' KB';
      if (previewBox) previewBox.style.display = 'flex';
    };
    reader.readAsDataURL(file);
  },

  clearAttachedImage() {
    this.state.pendingImage = null;
    this.state.pendingImageName = '';
    const previewBox = document.getElementById('chat-attached-preview');
    if (previewBox) previewBox.style.display = 'none';
    const fileInput = document.getElementById('chat-file-input');
    if (fileInput) fileInput.value = '';
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

  setMode(mode, save = true) {
    this.state.mode = mode;
    if (save) this.saveState();
    this.updateActivePersonaBadges();
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

  renderMessages() {
    const container = document.getElementById('chat-messages-wrap');
    if (!container) return;

    container.innerHTML = `
      <div class="messages-inner-container">
        ${this.state.messages.map(m => {
          const isUser = m.role === 'user';
          if (isUser) {
            return `
              <div class="message-row user-row" id="${m.id}">
                <div class="message-bubble user-bubble">
                  <div class="bubble-meta">
                    <span class="sender-name">👑 ${window.AISA_CONFIG.USER.name}</span>
                    <span class="message-time">${m.time}</span>
                  </div>
                  ${m.image ? `
                    <div class="bubble-attached-img-wrap">
                      <img src="${m.image}" class="bubble-attached-img" onclick="window.open('${m.image}', '_blank')" alt="Ảnh đính kèm" title="Nhấp để xem ảnh đầy đủ">
                    </div>
                  ` : ''}
                  <div class="bubble-text">${window.AisaMarkdown.format(m.text || '')}</div>
                </div>
              </div>
            `;
          }

          const isHarmony = m.speaker === 'HARMONY';
          const speakerBadge = isHarmony ? '🌸 Harmony' : '😈 Echo';
          const bubbleClass = isHarmony ? 'harmony-bubble' : 'echo-bubble';
          const personaAvatar = isHarmony ? '🌸' : '😈';
          const cleanText = window.AisaEngine ? window.AisaEngine.cleanReply(m.text) : m.text;

          return `
            <div class="message-row assistant-row ${isHarmony ? 'harmony-row' : 'echo-row'}" id="${m.id}">
              <div class="assistant-avatar ${isHarmony ? 'avt-harmony' : 'avt-echo'}">${personaAvatar}</div>
              <div class="message-bubble ${bubbleClass}">
                <div class="bubble-meta">
                  <span class="sender-name ${isHarmony ? 'name-harmony' : 'name-echo'}">${speakerBadge}</span>
                  <span class="message-time">${m.time}</span>
                  <div class="bubble-actions">
                    <button type="button" class="btn-bubble-action" onclick="window.AisaVoice.speak('${this.escapeQuotes(cleanText)}', '${m.speaker}')" title="Nghe giọng nói 🔊">
                      🔊
                    </button>
                    <button type="button" class="btn-bubble-action" onclick="navigator.clipboard.writeText('${this.escapeQuotes(cleanText)}')" title="Sao chép">
                      📋
                    </button>
                  </div>
                </div>
                <div class="bubble-text">${window.AisaMarkdown.format(cleanText)}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

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
    const imageToSend = this.state.pendingImage;

    // Phải có ít nhất nội dung văn bản hoặc hình ảnh
    if (!userText && !imageToSend) return;

    if (input) {
      input.value = '';
      input.style.height = 'auto';
    }

    // Xóa trạng thái preview ảnh sau khi đã lấy dữ liệu
    this.clearAttachedImage();

    // 1. Thêm tin nhắn user vào lịch sử
    const userMsg = {
      id: 'msg-' + Date.now(),
      role: 'user',
      time: this.getCurrentTimeString(),
      text: userText,
      image: imageToSend
    };
    this.state.messages.push(userMsg);

    // Cập nhật tiêu đề phiên tự động theo nội dung câu hỏi đầu tiên
    const currentSession = this.state.sessions.find(s => s.id === this.state.currentSessionId);
    if (currentSession && (currentSession.title === 'Phiên trò chuyện mới' || currentSession.title === 'Trò chuyện cùng AISA')) {
      const cleanTitle = userText.length > 26 ? userText.slice(0, 26) + '...' : userText;
      currentSession.title = cleanTitle || 'Cuộc trò chuyện';
    }

    this.saveState();
    this.renderSessionsList();
    this.renderMessages();

    // 2. Hiển thị Typing Indicator
    this.state.isGenerating = true;
    this.showTypingIndicator(userText);

    try {
      const replies = await window.AisaEngine.chat(
        userText,
        this.state.mode,
        this.state.scope,
        imageToSend
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
            text: clean
          });
        });
      } else {
        this.state.messages.push({
          id: 'msg-rep-' + Date.now(),
          role: 'assistant',
          speaker: 'HARMONY',
          avatar: '🌸',
          time: this.getCurrentTimeString(),
          text: `Dạ em đã ghi nhận yêu cầu của cậu rồi nà! Cậu cần em hỗ trợ thêm điều gì không? 🌸`
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

  showTypingIndicator(userText = '') {
    const container = document.querySelector('.messages-inner-container') || document.getElementById('chat-messages-wrap');
    if (!container) return;

    const lower = (userText || '').toLowerCase();
    const mentionsEcho = lower.includes('echo') || lower.includes('ếch cồ');
    const mentionsHarmony = lower.includes('harmony') || lower.includes('hà mòn');

    let avatar = '🌸😈';
    let label = 'Harmony & Echo đang cùng suy nghĩ...';

    if (this.state.mode === 'harmony' || (mentionsHarmony && !mentionsEcho)) {
      avatar = '🌸';
      label = mentionsHarmony ? 'Harmony đang suy nghĩ câu trả lời cho cậu... 🌸' : 'Harmony đang suy nghĩ... 🌸';
    } else if (this.state.mode === 'echo' || (mentionsEcho && !mentionsHarmony)) {
      avatar = '😈';
      label = mentionsEcho ? 'Echo đang suy nghĩ câu trả lời cho cậu... 😈' : 'Echo đang suy nghĩ... 😈';
    }

    const typingEl = document.createElement('div');
    typingEl.id = 'typing-indicator-node';
    typingEl.className = 'message-row assistant-row typing-row';
    typingEl.innerHTML = `
      <div class="assistant-avatar dual-typing">${avatar}</div>
      <div class="typing-bubble">
        <span class="typing-dot pink"></span>
        <span class="typing-dot purple"></span>
        <span class="typing-dot cyan"></span>
        <span class="typing-label">${label}</span>
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
  }
};

// Khởi chạy khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  window.AisaApp.init();
});
