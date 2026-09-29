/**
 * AISA COMPANION - LIVE2D MASCOT STAGE ENGINE (OPEN-LLM-VTUBER ARCHITECTURE)
 * Integrates PixiJS + Pixi-Live2D-Display + Cubism 4 Runtime
 * Characters: Harmony 🌸 (Shizuku) & Echo 😈 (Mao Pro)
 * Features: Cursor focus tracking, speech lip-sync, emotion expression mapping, touch interactions
 */
window.AisaLive2D = {
  app: null,
  model: null,
  currentSpeaker: 'harmony', // 'harmony' | 'echo'
  isLipSyncing: false,
  lipSyncTimer: null,
  isVisible: true,
  isInitialized: false,
  bubbleTimeout: null,

  mascots: {
    harmony: {
      name: 'Harmony 🌸',
      path: 'assets/live2d-models/shizuku/runtime/shizuku.model3.json',
      scale: 0.20,
      yOffset: 25,
      badgeColor: '#f472b6'
    },
    echo: {
      name: 'Echo 😈',
      path: 'assets/live2d-models/mao_pro/runtime/mao_pro.model3.json',
      scale: 0.16,
      yOffset: 30,
      badgeColor: '#a78bfa'
    }
  },

  async init() {
    if (this.isInitialized) return;

    const container = document.getElementById('live2d-stage-container');
    const canvas = document.getElementById('live2d-canvas');
    if (!container || !canvas) return;

    // Check if PIXI is available
    if (typeof PIXI === 'undefined') {
      console.warn('[AISA Live2D] Pixi.js not loaded yet.');
      return;
    }

    try {
      const width = 260;
      const height = 319;
      canvas.width = width;
      canvas.height = height;
      canvas.style.background = 'transparent';

      // Register Ticker with Live2DModel if available (Crucial for Live2D rendering & motions)
      if (PIXI.live2d && PIXI.live2d.Live2DModel && PIXI.Ticker) {
        try {
          PIXI.live2d.Live2DModel.registerTicker(PIXI.Ticker);
        } catch (e) {
          console.warn('[AISA Live2D] registerTicker notice:', e);
        }
      }

      this.app = new PIXI.Application({
        view: canvas,
        width: width,
        height: height,
        backgroundAlpha: 0,
        backgroundColor: 0x000000,
        clearBeforeRender: true,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1
      });

      // Force transparent renderer
      if (this.app.renderer && this.app.renderer.background) {
        this.app.renderer.background.alpha = 0;
      }

      // Load default mascot (Harmony)
      await this.loadModel('harmony');

      // 60FPS Harmonic Lip-Sync Ticker
      this.app.ticker.add(() => {
        if (!this.model || !this.model.internalModel) return;
        const core = this.model.internalModel.coreModel;
        if (!core) return;

        if (this.isLipSyncing) {
          // Dynamic harmonic vocal mouth wave (natural anime speaking rhythm)
          const mouthVal = 0.45 + 0.35 * Math.sin(Date.now() / 80) + 0.15 * Math.sin(Date.now() / 35);
          const clamped = Math.max(0, Math.min(0.95, mouthVal));

          if (typeof core.setParameterValueById === 'function') {
            core.setParameterValueById('ParamMouthOpenY', clamped);
            core.setParameterValueById('PARAM_MOUTH_OPEN_Y', clamped);
          } else if (typeof core.setParamFloat === 'function') {
            core.setParamFloat('PARAM_MOUTH_OPEN_Y', clamped);
          }
        }
      });

      // Bind interactive cursor tracking
      window.addEventListener('mousemove', (e) => {
        if (!this.model || !this.isVisible) return;
        if (typeof this.model.focus === 'function') {
          this.model.focus(e.clientX, e.clientY);
        }
      });

      // Bind Voice Events for Lip-sync & Emotion Reaction
      window.addEventListener('aisa-emotion', (e) => {
        const { speaker, emotion } = e.detail || {};
        if (speaker) {
          const spk = speaker.toLowerCase().includes('echo') ? 'echo' : 'harmony';
          if (spk !== this.currentSpeaker) {
            this.switchMascot(spk);
          }
        }
        if (emotion) {
          this.setEmotion(emotion);
        }
      });

      window.addEventListener('aisa-interrupted', () => {
        this.stopLipSync();
        this.showSpeechBubble('🛑 Đã ngắt lời!', 2000);
      });

      this.isInitialized = true;
      console.log('🌸 [AISA Live2D] Stage initialized successfully!');
    } catch (err) {
      console.error('[AISA Live2D Error during init]:', err);
    }
  },

  async loadModel(mascotKey) {
    const mascotInfo = this.mascots[mascotKey] || this.mascots.harmony;
    this.currentSpeaker = mascotKey;

    const titleEl = document.getElementById('live2d-speaker-name');
    if (titleEl) {
      titleEl.textContent = mascotInfo.name;
      titleEl.style.color = mascotInfo.badgeColor;
    }

    if (!PIXI.live2d || !PIXI.live2d.Live2DModel) {
      console.warn('[AISA Live2D] Live2DModel not available in PIXI namespace.');
      return;
    }

    try {
      if (this.model) {
        this.app.stage.removeChild(this.model);
        try { this.model.destroy(); } catch (e) {}
        this.model = null;
      }

      console.log(`🌸 [AISA Live2D] Loading ${mascotInfo.name} from: ${mascotInfo.path}`);
      const model = await PIXI.live2d.Live2DModel.from(mascotInfo.path, {
        autoInteract: true
      });

      this.model = model;
      this.app.stage.addChild(model);

      // Positioning & scale
      model.anchor.set(0.5, 0.5);
      model.x = (this.app.renderer.width || 260) / (2 * (this.app.renderer.resolution || 1));
      model.y = ((this.app.renderer.height || 319) / (2 * (this.app.renderer.resolution || 1))) + mascotInfo.yOffset;
      model.scale.set(mascotInfo.scale);

      // Interactive click: Trigger random expression / motion
      model.interactive = true;
      model.on('pointertap', () => {
        this.onModelClick();
      });

      console.log(`🌸 [AISA Live2D] ${mascotInfo.name} is now active on stage!`);
    } catch (e) {
      console.warn(`[AISA Live2D] Failed to load ${mascotInfo.name}:`, e);
    }
  },

  async switchMascot(targetKey = null) {
    const nextKey = targetKey || (this.currentSpeaker === 'harmony' ? 'echo' : 'harmony');
    await this.loadModel(nextKey);
    const bubbleMsg = nextKey === 'harmony' ? 'Em là Harmony đây ạ! 🌸' : 'Echo tới đây! Cà khịa mode on! 😈';
    this.showSpeechBubble(bubbleMsg, 2500);
  },

  toggleVisibility() {
    this.isVisible = !this.isVisible;
    const container = document.getElementById('live2d-stage-container');
    const toggleBtn = document.getElementById('btn-toggle-live2d');
    if (container) {
      if (this.isVisible) {
        container.classList.remove('hidden');
        if (toggleBtn) toggleBtn.classList.add('active');
        if (!this.isInitialized) {
          this.init();
        }
      } else {
        container.classList.add('hidden');
        if (toggleBtn) toggleBtn.classList.remove('active');
        this.stopLipSync();
      }
    }
  },

  setEmotion(emotionKey) {
    if (!this.model) return;
    const emo = (emotionKey || '').toLowerCase();

    // Emotion to expression mapping
    const emotionMap = {
      joy: 0,
      smile: 0,
      blush: 1,
      smirk: 2,
      grin: 2,
      anger: 3,
      pout: 3,
      surprised: 4,
      think: 5,
      crying: 6,
      gentle: 7,
      caring: 7
    };

    const expIndex = emotionMap[emo];
    try {
      if (expIndex !== undefined && typeof this.model.expression === 'function') {
        this.model.expression(expIndex);
      }
    } catch (e) {}

    // Show mini status icon above head
    const emojiMap = {
      joy: '✨ Vui vẻ',
      smile: '😊 Mỉm cười',
      blush: '😳 Ngại ngùng',
      smirk: '😏 Đắc ý',
      pout: '😤 Bĩu môi',
      anger: '💢 Hờn dỗi',
      surprised: '😲 Bất ngờ',
      think: '🤔 Suy nghĩ',
      crying: '😭 Cảm động',
      gentle: '💖 Dịu dàng',
      caring: '🌸 Ân cần'
    };
    if (emojiMap[emo]) {
      this.showSpeechBubble(emojiMap[emo], 2500);
    }
  },

  startLipSync() {
    this.isLipSyncing = true;
  },

  stopLipSync() {
    this.isLipSyncing = false;
    if (this.model && this.model.internalModel && this.model.internalModel.coreModel) {
      const core = this.model.internalModel.coreModel;
      try {
        if (typeof core.setParameterValueById === 'function') {
          core.setParameterValueById('ParamMouthOpenY', 0);
          core.setParameterValueById('PARAM_MOUTH_OPEN_Y', 0);
        } else if (typeof core.setParamFloat === 'function') {
          core.setParamFloat('PARAM_MOUTH_OPEN_Y', 0);
        }
      } catch (e) {}
    }
  },

  showSpeechBubble(text, duration = 3000) {
    const bubble = document.getElementById('live2d-speech-bubble');
    if (!bubble) return;
    bubble.textContent = text;
    bubble.style.display = 'block';

    if (this.bubbleTimeout) clearTimeout(this.bubbleTimeout);
    this.bubbleTimeout = setTimeout(() => {
      bubble.style.display = 'none';
    }, duration);
  },

  onModelClick() {
    if (!this.model) return;
    const cheers = this.currentSpeaker === 'harmony'
      ? ['Cậu cần em hỗ trợ gì nè? 🌸', 'Sakura ngoan, giữ gìn sức khỏe nha! ✨', 'Em luôn ở bên cạnh cậu nè! 💖']
      : ['Ê, chọc tớ hoài coi chừng bị chê deadline nha! 😈', 'Bớt bấm lung tung đi nào! 😏', 'Cần Echo ra tay vặn vẹo ai hong? ⚔️'];
    const randomMsg = cheers[Math.floor(Math.random() * cheers.length)];
    this.showSpeechBubble(randomMsg, 3000);

    // Random expression
    try {
      if (typeof this.model.expression === 'function') {
        const randExp = Math.floor(Math.random() * 6);
        this.model.expression(randExp);
      }
    } catch (e) {}
  }
};

// Auto initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (window.AisaLive2D && !window.AisaLive2D.isInitialized) {
      window.AisaLive2D.init();
    }
  }, 300);
});
