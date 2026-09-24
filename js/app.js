/**
 * AISA COMPANION - MAIN APPLICATION CONTROLLER
 * Miyazaki Haruto Entertainment Co., Ltd. - Project MHEnt. Universe
 */
window.AisaApp = {
  state: {
    mode: 'duo',       // 'duo' | 'harmony' | 'echo'
    scope: 'personal', // 'personal' | 'workspace' | 'study' | 'portal'
    messages: [],
    isGenerating: false,
    pendingImage: null,
    pendingImageName: ''
  },

  init() {
    this.loadState();
    this.bindEvents();
    this.updateGreeting();
    this.renderMessages();

    // Khởi tạo các module vệ tinh
    if (window.AisaVoice) window.AisaVoice.init();
    if (window.AisaMemory) window.AisaMemory.init();
    if (window.AisaVision) window.AisaVision.init();

    // Lời chào mở đầu nếu chưa có lịch sử
    if (this.state.messages.length === 0) {
      this.initWelcomeSession();
    }
  },

  loadState() {
    try {
      const savedHistory = localStorage.getItem(window.AISA_CONFIG.STORAGE.HISTORY);
      if (savedHistory) this.state.messages = JSON.parse(savedHistory);

      const savedMode = localStorage.getItem(window.AISA_CONFIG.STORAGE.ACTIVE_MODE);
      if (savedMode) this.state.mode = savedMode;

      const savedScope = localStorage.getItem(window.AISA_CONFIG.STORAGE.ACTIVE_SCOPE);
      if (savedScope) this.state.scope = savedScope;
    } catch (e) {
      console.warn('Could not load saved state:', e);
    }
  },

  saveState() {
    try {
      localStorage.setItem(window.AISA_CONFIG.STORAGE.HISTORY, JSON.stringify(this.state.messages));
      localStorage.setItem(window.AISA_CONFIG.STORAGE.ACTIVE_MODE, this.state.mode);
      localStorage.setItem(window.AISA_CONFIG.STORAGE.ACTIVE_SCOPE, this.state.scope);
    } catch (e) {}
  },

  initWelcomeSession() {
    const hour = new Date().getHours();
    let timeNote = "Chào buổi sáng rực rỡ nè!";
    if (hour >= 12 && hour < 18) timeNote = "Một buổi chiều làm việc thật nhiều năng lượng nha!";
    if (hour >= 18 && hour < 22) timeNote = "Buổi tối ấm áp và thư thái nhé cậu!";
    if (hour >= 22 || hour < 5) timeNote = "Đêm đã muộn rồi nè, cậu nhớ chú ý sức khỏe đừng thức khuya quá nha...";

    this.state.messages = [
      {
        id: 'msg-welcome-h',
        role: 'assistant',
        speaker: 'HARMONY',
        avatar: '🌸',
        time: this.getCurrentTimeString(),
        text: `Chào cậu iu dấu! 🌸 Em là Harmony nè. ${timeNote}\nĐây là **Sanctuary** riêng tư của chúng mình – nơi em và Echo luôn kề cận để lắng nghe mọi tâm sự, hỗ trợ công việc và đồng hành cùng cậu mỗi ngày! Cậu có thể trò chuyện, gửi ảnh tâm sự hay hỏi bất cứ điều gì nha! ✨`
      },
      {
        id: 'msg-welcome-e',
        role: 'assistant',
        speaker: 'ECHO',
        avatar: '😈',
        time: this.getCurrentTimeString(),
        text: `Hé lô đằng ấy! Còn tớ là Echo đây 😈. Bước vào đây rồi thì đừng hòng giấu giếm tớ điều gì nha! Hôm nay có chuyện gì vui, có ảnh meme hay ho nào, hoặc lại bị deadline dí mà mò vào đây tìm hai đứa tớ thế hả? Khai mau đi nào!`
      }
    ];
    this.saveState();
    this.renderMessages();
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

      // Hỗ trợ dán ảnh trực tiếp từ Clipboard (Ctrl + V) như Gemini
      input.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
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

    // Quick Chips
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

    // Ambience buttons (hỗ trợ cả header và sidebar)
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
      btnSaveGeminiKey.addEventListener('click', () => {
        const key = inputGeminiKey.value.trim();
        if (key) {
          localStorage.setItem(window.AISA_CONFIG.STORAGE.GEMINI_KEY, key);
          alert('✨ Đã lưu Google Gemini API Key! Giờ đây AISA sẽ chạy siêu tốc và xử lý đa nhiệm hình ảnh/công việc cực nhạy!');
        } else {
          localStorage.removeItem(window.AISA_CONFIG.STORAGE.GEMINI_KEY);
          alert('Đã xóa Gemini API Key, AISA sẽ sử dụng Cloudflare Backend mặc định.');
        }
      });
    }

    // Clear Chat
    const btnClear = document.getElementById('btn-clear-chat');
    const btnNewSession = document.getElementById('btn-new-session');
    const clearAction = () => {
      if (confirm('Cậu có chắc muốn dọn sạch lịch sử phiên trò chuyện này không nè? (Ký ức dài hạn trên Edge D1 vẫn được giữ an toàn!)')) {
        this.state.messages = [];
        this.initWelcomeSession();
      }
    };
    if (btnClear) btnClear.addEventListener('click', clearAction);
    if (btnNewSession) btnNewSession.addEventListener('click', clearAction);
  },

  attachImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Vui lòng chọn hoặc dán tệp hình ảnh hợp lệ (PNG, JPG, WebP).');
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

  setMode(mode) {
    this.state.mode = mode;
    this.saveState();
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

          return `
            <div class="message-row assistant-row ${isHarmony ? 'harmony-row' : 'echo-row'}" id="${m.id}">
              <div class="assistant-avatar ${isHarmony ? 'avt-harmony' : 'avt-echo'}">${personaAvatar}</div>
              <div class="message-bubble ${bubbleClass}">
                <div class="bubble-meta">
                  <span class="sender-name ${isHarmony ? 'name-harmony' : 'name-echo'}">${speakerBadge}</span>
                  <span class="message-time">${m.time}</span>
                  <div class="bubble-actions">
                    <button type="button" class="btn-bubble-action" onclick="window.AisaVoice.speak('${this.escapeQuotes(m.text)}', '${m.speaker}')" title="Nghe giọng nói 🔊">
                      🔊
                    </button>
                    <button type="button" class="btn-bubble-action" onclick="navigator.clipboard.writeText('${this.escapeQuotes(m.text)}')" title="Sao chép">
                      📋
                    </button>
                  </div>
                </div>
                <div class="bubble-text">${window.AisaMarkdown.format(m.text)}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    container.scrollTop = container.scrollHeight;
  },

  escapeQuotes(str) {
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' ');
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
    this.saveState();
    this.renderMessages();

    // 2. Hiển thị Typing Indicator
    this.state.isGenerating = true;
    this.showTypingIndicator();

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
          this.state.messages.push({
            id: 'msg-rep-' + (Date.now() + idx),
            role: 'assistant',
            speaker: rep.speaker,
            avatar: rep.avatar || (rep.speaker === 'HARMONY' ? '🌸' : '😈'),
            time: this.getCurrentTimeString(),
            text: rep.text
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

  showTypingIndicator() {
    const container = document.querySelector('.messages-inner-container') || document.getElementById('chat-messages-wrap');
    if (!container) return;

    const typingEl = document.createElement('div');
    typingEl.id = 'typing-indicator-node';
    typingEl.className = 'message-row assistant-row typing-row';
    typingEl.innerHTML = `
      <div class="assistant-avatar dual-typing">🌸😈</div>
      <div class="typing-bubble">
        <span class="typing-dot pink"></span>
        <span class="typing-dot purple"></span>
        <span class="typing-dot cyan"></span>
        <span class="typing-label">Harmony & Echo đang cùng suy nghĩ...</span>
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
