/**
 * AISA COMPANION - LIVE2D MASCOT STAGE ENGINE (OPEN-LLM-VTUBER ARCHITECTURE)
 * Features:
 * 1. Dual Mascot Simultaneous Display (Harmony 🌸 & Echo 😈 in Song Hành Mode)
 * 2. Gemini Live Studio View (Full stage theater mode + chat sidebar)
 * 3. Interactive Pan & Zoom (Drag to move, scroll wheel to zoom, reset button)
 * 4. Speaker-aware 60FPS Harmonic Lip-Sync
 * 5. Emotion expression mapping & mouse cursor tracking
 * Miyazaki Haruto Entertainment Co., Ltd.
 */
window.AisaLive2D = {
  app: null,
  models: {
    harmony: null,
    echo: null
  },
  currentMode: 'duo', // 'duo' | 'harmony' | 'echo'
  isLipSyncing: false,
  lipSyncSpeaker: 'harmony',
  isVisible: true,
  isInitialized: false,
  isLiveStudio: false,
  bubbleTimeout: null,

  // Pan & Zoom Transform State
  panOffset: { x: 0, y: 0 },
  zoomFactor: 1.0,
  isDragging: false,
  dragStart: { x: 0, y: 0 },
  initialPan: { x: 0, y: 0 },

  mascots: {
    harmony: {
      name: 'Harmony 🌸',
      path: 'assets/live2d-models/shizuku/runtime/shizuku.model3.json',
      baseScale: 0.20,
      yOffset: 25,
      badgeColor: '#f472b6'
    },
    echo: {
      name: 'Echo 😈',
      path: 'assets/live2d-models/mao_pro/runtime/mao_pro.model3.json',
      baseScale: 0.16,
      yOffset: 30,
      badgeColor: '#a78bfa'
    }
  },

  async init() {
    if (this.isInitialized) return;

    const container = document.getElementById('live2d-stage-container');
    const canvas = document.getElementById('live2d-canvas');
    if (!container || !canvas) return;

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

      // Register Ticker with Live2DModel if available
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

      if (this.app.renderer && this.app.renderer.background) {
        this.app.renderer.background.alpha = 0;
      }

      // 60FPS Harmonic Lip-Sync Ticker for both Harmony & Echo
      this.app.ticker.add(() => {
        if (!this.isLipSyncing) return;

        // Dynamic harmonic vocal mouth wave (natural speaking rhythm)
        const mouthVal = 0.45 + 0.35 * Math.sin(Date.now() / 80) + 0.15 * Math.sin(Date.now() / 35);
        const clamped = Math.max(0, Math.min(0.95, mouthVal));

        const targetModel = this.lipSyncSpeaker === 'echo' 
          ? (this.models.echo || this.models.harmony) 
          : (this.models.harmony || this.models.echo);

        if (targetModel && targetModel.internalModel) {
          const core = targetModel.internalModel.coreModel;
          if (core) {
            if (typeof core.setParameterValueById === 'function') {
              core.setParameterValueById('ParamMouthOpenY', clamped);
              core.setParameterValueById('PARAM_MOUTH_OPEN_Y', clamped);
            } else if (typeof core.setParamFloat === 'function') {
              core.setParamFloat('PARAM_MOUTH_OPEN_Y', clamped);
            }
          }
        }
      });

      // Load both models
      await this.loadBothModels();

      // Bind Mouse / Touch Drag & Zoom
      this.bindPanAndZoom(canvas);

      // Listen for window resize to adjust Live Studio
      window.addEventListener('resize', () => {
        if (this.isLiveStudio) {
          this.resizeForLiveStudio();
        }
      });

      // Bind Voice Events for Lip-sync & Emotion Reaction
      window.addEventListener('aisa-emotion', (e) => {
        const { speaker, emotion } = e.detail || {};
        const spk = (speaker || '').toLowerCase().includes('echo') ? 'echo' : 'harmony';
        this.setEmotion(emotion, spk);
      });

      window.addEventListener('aisa-interrupted', () => {
        this.stopLipSync();
        this.showSpeechBubble('🛑 Đã ngắt lời!', 2000, this.lipSyncSpeaker);
      });

      this.isInitialized = true;
      console.log('🌸 [AISA Live2D] Stage initialized successfully with Duo & Live Studio support!');
    } catch (err) {
      console.error('[AISA Live2D Error during init]:', err);
    }
  },

  async loadBothModels() {
    if (!PIXI.live2d || !PIXI.live2d.Live2DModel) {
      console.warn('[AISA Live2D] Live2DModel not available in PIXI.');
      return;
    }

    try {
      // 1. Load Harmony 🌸 (Shizuku)
      console.log('🌸 [AISA Live2D] Loading Harmony (Shizuku)...');
      const harmonyModel = await PIXI.live2d.Live2DModel.from(this.mascots.harmony.path, { autoInteract: true });
      harmonyModel.anchor.set(0.5, 0.5);
      harmonyModel.interactive = true;
      harmonyModel.on('pointertap', () => this.onModelClick('harmony'));
      this.models.harmony = harmonyModel;
      this.app.stage.addChild(harmonyModel);

      // 2. Load Echo 😈 (Mao Pro)
      console.log('😈 [AISA Live2D] Loading Echo (Mao Pro)...');
      const echoModel = await PIXI.live2d.Live2DModel.from(this.mascots.echo.path, { autoInteract: true });
      echoModel.anchor.set(0.5, 0.5);
      echoModel.interactive = true;
      echoModel.on('pointertap', () => this.onModelClick('echo'));
      this.models.echo = echoModel;
      this.app.stage.addChild(echoModel);

      // Initial layout alignment
      this.updateModelsLayout();
      console.log('🌸😈 [AISA Live2D] Both Harmony & Echo are now active on stage!');
    } catch (e) {
      console.warn('[AISA Live2D] Failed loading both models:', e);
    }
  },

  updateModelsLayout() {
    if (!this.app || !this.app.renderer) return;

    const rw = (this.app.renderer.width || 260) / (this.app.renderer.resolution || 1);
    const rh = (this.app.renderer.height || 319) / (this.app.renderer.resolution || 1);

    const isDuo = this.currentMode === 'duo';
    const isStudio = this.isLiveStudio;

    // Scale multipliers
    const studioScaleMult = isStudio ? 1.75 : 1.0;
    const duoScaleMult = isDuo ? (isStudio ? 1.45 : 0.82) : 1.0;

    // Title update
    const titleEl = document.getElementById('live2d-speaker-name');
    if (titleEl) {
      if (isDuo) {
        titleEl.textContent = 'Song Hành 🌸😈';
        titleEl.style.color = '#f472b6';
      } else if (this.currentMode === 'harmony') {
        titleEl.textContent = 'Harmony 🌸';
        titleEl.style.color = '#f472b6';
      } else {
        titleEl.textContent = 'Echo 😈';
        titleEl.style.color = '#a78bfa';
      }
    }

    // Harmony layout
    if (this.models.harmony) {
      if (this.currentMode === 'duo') {
        this.models.harmony.visible = true;
        const targetX = (rw * 0.32) + this.panOffset.x;
        const targetY = (rh * 0.5 + this.mascots.harmony.yOffset) + this.panOffset.y;
        this.models.harmony.position.set(targetX, targetY);
        this.models.harmony.scale.set(this.mascots.harmony.baseScale * this.zoomFactor * duoScaleMult * studioScaleMult);
      } else if (this.currentMode === 'harmony') {
        this.models.harmony.visible = true;
        const targetX = (rw * 0.5) + this.panOffset.x;
        const targetY = (rh * 0.5 + this.mascots.harmony.yOffset) + this.panOffset.y;
        this.models.harmony.position.set(targetX, targetY);
        this.models.harmony.scale.set(this.mascots.harmony.baseScale * this.zoomFactor * studioScaleMult);
      } else {
        this.models.harmony.visible = false;
      }
    }

    // Echo layout
    if (this.models.echo) {
      if (this.currentMode === 'duo') {
        this.models.echo.visible = true;
        const targetX = (rw * 0.68) + this.panOffset.x;
        const targetY = (rh * 0.5 + this.mascots.echo.yOffset) + this.panOffset.y;
        this.models.echo.position.set(targetX, targetY);
        this.models.echo.scale.set(this.mascots.echo.baseScale * this.zoomFactor * duoScaleMult * studioScaleMult);
      } else if (this.currentMode === 'echo') {
        this.models.echo.visible = true;
        const targetX = (rw * 0.5) + this.panOffset.x;
        const targetY = (rh * 0.5 + this.mascots.echo.yOffset) + this.panOffset.y;
        this.models.echo.position.set(targetX, targetY);
        this.models.echo.scale.set(this.mascots.echo.baseScale * this.zoomFactor * studioScaleMult);
      } else {
        this.models.echo.visible = false;
      }
    }
  },

  bindPanAndZoom(canvas) {
    // 1. Drag / Pan with Pointer Events
    canvas.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.initialPan = { x: this.panOffset.x, y: this.panOffset.y };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    });

    canvas.addEventListener('pointermove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        this.panOffset.x = this.initialPan.x + dx;
        this.panOffset.y = this.initialPan.y + dy;
        this.updateModelsLayout();
      } else {
        // Look at mouse
        if (this.models.harmony && this.models.harmony.visible && typeof this.models.harmony.focus === 'function') {
          this.models.harmony.focus(e.clientX, e.clientY);
        }
        if (this.models.echo && this.models.echo.visible && typeof this.models.echo.focus === 'function') {
          this.models.echo.focus(e.clientX, e.clientY);
        }
      }
    });

    const endDrag = (e) => {
      this.isDragging = false;
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    };

    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    // 2. Scroll Wheel to Zoom
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? 0.92 : 1.08;
      this.zoomFactor = Math.max(0.4, Math.min(3.5, this.zoomFactor * zoomDelta));
      this.updateModelsLayout();
    }, { passive: false });
  },

  resetTransform() {
    this.panOffset = { x: 0, y: 0 };
    this.zoomFactor = 1.0;
    this.updateModelsLayout();
    this.showSpeechBubble('Đã đặt lại góc nhìn mặc định! ✨', 2000);
  },

  toggleLiveStudio() {
    this.isLiveStudio = !this.isLiveStudio;
    const container = document.getElementById('live2d-stage-container');
    const headerBtn = document.getElementById('btn-toggle-live-studio');

    if (this.isLiveStudio) {
      if (container) container.classList.add('live-studio-mode');
      document.body.classList.add('live-studio-active');
      if (headerBtn) headerBtn.classList.add('active');
      this.resizeForLiveStudio();
      this.showSpeechBubble('Chào mừng đến với Gemini Live Studio! 🌸😈', 3000);
    } else {
      if (container) container.classList.remove('live-studio-mode');
      document.body.classList.remove('live-studio-active');
      if (headerBtn) headerBtn.classList.remove('active');
      if (this.app && this.app.renderer) {
        this.app.renderer.resize(260, 319);
      }
      this.updateModelsLayout();
    }
  },

  resizeForLiveStudio() {
    if (!this.app || !this.app.renderer) return;
    const isWide = window.innerWidth > 900;
    const targetWidth = isWide ? (window.innerWidth - 420) : window.innerWidth;
    const targetHeight = isWide ? (window.innerHeight - 54) : (window.innerHeight * 0.5);

    this.app.renderer.resize(targetWidth, targetHeight);
    this.updateModelsLayout();
  },

  switchMascot() {
    // Cycles: duo -> harmony -> echo -> duo
    if (this.currentMode === 'duo') {
      this.currentMode = 'harmony';
      this.showSpeechBubble('Chỉ riêng Harmony đồng hành cùng cậu nè! 🌸', 2500, 'harmony');
    } else if (this.currentMode === 'harmony') {
      this.currentMode = 'echo';
      this.showSpeechBubble('Tới lượt Echo chiếm sân khấu rồi! 😈', 2500, 'echo');
    } else {
      this.currentMode = 'duo';
      this.showSpeechBubble('Cả hai em cùng Song Hành nhé Master! 🌸😈', 2500, 'duo');
    }
    this.updateModelsLayout();
  },

  toggleVisibility() {
    this.isVisible = !this.isVisible;
    const container = document.getElementById('live2d-stage-container');
    const toggleBtn = document.getElementById('btn-toggle-live2d');
    if (container) {
      if (this.isVisible) {
        container.classList.remove('hidden');
        if (toggleBtn) toggleBtn.classList.add('active');
        if (!this.isInitialized) this.init();
      } else {
        container.classList.add('hidden');
        if (toggleBtn) toggleBtn.classList.remove('active');
        this.stopLipSync();
      }
    }
  },

  setEmotion(emotionKey, targetSpeaker = 'harmony') {
    const targetModel = targetSpeaker === 'echo' ? this.models.echo : this.models.harmony;
    if (!targetModel) return;

    const emo = (emotionKey || '').toLowerCase();
    const emotionMap = {
      joy: 0, smile: 0, blush: 1, smirk: 2, grin: 2,
      anger: 3, pout: 3, surprised: 4, think: 5,
      crying: 6, gentle: 7, caring: 7
    };

    const expIndex = emotionMap[emo];
    try {
      if (expIndex !== undefined && typeof targetModel.expression === 'function') {
        targetModel.expression(expIndex);
      }
    } catch (e) {}

    const emojiMap = {
      joy: '✨ Vui vẻ', smile: '😊 Mỉm cười', blush: '😳 Ngại ngùng',
      smirk: '😏 Đắc ý', pout: '😤 Bĩu môi', anger: '💢 Hờn dỗi',
      surprised: '😲 Bất ngờ', think: '🤔 Suy nghĩ', crying: '😭 Cảm động',
      gentle: '💖 Dịu dàng', caring: '🌸 Ân cần'
    };
    if (emojiMap[emo]) {
      this.showSpeechBubble(emojiMap[emo], 2500, targetSpeaker);
    }
  },

  startLipSync(speaker = 'harmony') {
    this.isLipSyncing = true;
    this.lipSyncSpeaker = (speaker || 'harmony').toLowerCase().includes('echo') ? 'echo' : 'harmony';
  },

  stopLipSync() {
    this.isLipSyncing = false;
    ['harmony', 'echo'].forEach(spk => {
      const mdl = this.models[spk];
      if (mdl && mdl.internalModel && mdl.internalModel.coreModel) {
        const core = mdl.internalModel.coreModel;
        try {
          if (typeof core.setParameterValueById === 'function') {
            core.setParameterValueById('ParamMouthOpenY', 0);
            core.setParameterValueById('PARAM_MOUTH_OPEN_Y', 0);
          } else if (typeof core.setParamFloat === 'function') {
            core.setParamFloat('PARAM_MOUTH_OPEN_Y', 0);
          }
        } catch (e) {}
      }
    });
  },

  showSpeechBubble(text, duration = 3000, speaker = 'harmony') {
    const bubble = document.getElementById('live2d-speech-bubble');
    if (!bubble) return;

    bubble.textContent = text;
    bubble.className = 'live2d-speech-bubble';
    if (speaker === 'echo') {
      bubble.classList.add('bubble-echo');
    } else {
      bubble.classList.add('bubble-harmony');
    }
    bubble.style.display = 'block';

    if (this.bubbleTimeout) clearTimeout(this.bubbleTimeout);
    this.bubbleTimeout = setTimeout(() => {
      bubble.style.display = 'none';
    }, duration);
  },

  onModelClick(speaker) {
    const cheers = speaker === 'harmony'
      ? ['Cậu cần em hỗ trợ gì nè? 🌸', 'Sakura ngoan, giữ gìn sức khỏe nha! ✨', 'Em luôn ở bên cạnh cậu nè! 💖']
      : ['Ê, chọc tớ hoài coi chừng bị chê deadline nha! 😈', 'Bớt bấm lung tung đi nào! 😏', 'Cần Echo ra tay vặn vẹo ai hong? ⚔️'];
    const randomMsg = cheers[Math.floor(Math.random() * cheers.length)];
    this.showSpeechBubble(randomMsg, 3000, speaker);

    const targetModel = this.models[speaker];
    if (targetModel && typeof targetModel.expression === 'function') {
      try {
        const randExp = Math.floor(Math.random() * 6);
        targetModel.expression(randExp);
      } catch (e) {}
    }
  }
};

// Auto initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (window.AisaLive2D && !window.AisaLive2D.isInitialized) {
      window.AisaLive2D.init();
    }
  }, 350);
});
