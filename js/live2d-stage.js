/**
 * AISA COMPANION - LIVE2D MASCOT STAGE ENGINE (OPEN-LLM-VTUBER ARCHITECTURE)
 * Features:
 * 1. Dual Mascot Display (Harmony 🌸 & Echo 😈 in Song Hành Mode)
 * 2. Strict Single-Instance Latch (Zero duplicate/ghost models)
 * 3. Proportional Scaling: Matched anime heights for Harmony & Echo
 * 4. Independent Dragging: Click & drag Harmony moves Harmony; click & drag Echo moves Echo
 * 5. Interactive Tapping: Tap character triggers Vietnamese voice line & emotion
 * 6. Gemini Live Studio View (Full stage theater mode + chat sidebar)
 * 7. Interactive Pan & Zoom (Drag background to pan stage, scroll wheel to zoom, reset button)
 * 8. Speaker-aware 60FPS Harmonic Lip-Sync
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
  isInitializing: false,
  isLiveStudio: false,
  bubbleTimeout: null,

  // Transform State
  zoomFactor: 1.0,
  stagePan: { x: 0, y: 0 },
  activeDragTarget: null, // 'harmony' | 'echo' | 'stage' | null
  dragStartPointer: { x: 0, y: 0 },
  dragStartModelPos: { x: 0, y: 0 },
  hasDragged: false,

  mascots: {
    harmony: {
      name: 'Harmony 🌸',
      path: 'assets/live2d-models/shizuku/runtime/shizuku.model3.json',
      miniScale: 0.18,
      duoMiniScale: 0.13,
      studioScale: 0.50,
      duoStudioScale: 0.40,
      yOffset: 30,
      badgeColor: '#f472b6'
    },
    echo: {
      name: 'Echo 😈',
      path: 'assets/live2d-models/mao_pro/runtime/mao_pro.model3.json',
      miniScale: 0.058,
      duoMiniScale: 0.042,
      studioScale: 0.160,
      duoStudioScale: 0.128,
      yOffset: 35,
      badgeColor: '#a78bfa'
    }
  },

  async init() {
    // Strict Single-Instance Latch to prevent duplicate models
    if (this.isInitialized || this.isInitializing) return;
    this.isInitializing = true;

    const container = document.getElementById('live2d-stage-container');
    const canvas = document.getElementById('live2d-canvas');
    if (!container || !canvas) {
      this.isInitializing = false;
      return;
    }

    if (typeof PIXI === 'undefined') {
      console.warn('[AISA Live2D] Pixi.js not loaded yet.');
      this.isInitializing = false;
      return;
    }

    try {
      const width = 280;
      const height = 338;
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

        // Dynamic harmonic vocal mouth wave (natural anime speaking rhythm)
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

      // Load both models strictly once
      await this.loadBothModels();

      // Bind Mouse / Touch Drag & Zoom
      this.bindInteractions(canvas);

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
      this.isInitializing = false;
      console.log('🌸 [AISA Live2D] Single-instance stage initialized successfully!');
    } catch (err) {
      this.isInitializing = false;
      console.error('[AISA Live2D Error during init]:', err);
    }
  },

  async loadBothModels() {
    if (!PIXI.live2d || !PIXI.live2d.Live2DModel) {
      console.warn('[AISA Live2D] Live2DModel not available in PIXI.');
      return;
    }

    try {
      // 1. Destroy and clear any existing children on stage
      if (this.app && this.app.stage) {
        while (this.app.stage.children.length > 0) {
          const child = this.app.stage.children[0];
          this.app.stage.removeChild(child);
          try { child.destroy({ children: true, texture: false, baseTexture: false }); } catch (e) {}
        }
      }
      this.models.harmony = null;
      this.models.echo = null;

      // 2. Load Harmony 🌸 (Shizuku)
      console.log('🌸 [AISA Live2D] Loading Harmony (Shizuku)...');
      const harmonyModel = await PIXI.live2d.Live2DModel.from(this.mascots.harmony.path, { autoInteract: false });
      harmonyModel.anchor.set(0.5, 0.5);
      harmonyModel.interactive = false;
      this.models.harmony = harmonyModel;
      this.app.stage.addChild(harmonyModel);

      // 3. Load Echo 😈 (Mao Pro)
      console.log('😈 [AISA Live2D] Loading Echo (Mao Pro)...');
      const echoModel = await PIXI.live2d.Live2DModel.from(this.mascots.echo.path, { autoInteract: false });
      echoModel.anchor.set(0.5, 0.5);
      echoModel.interactive = false;
      this.models.echo = echoModel;
      this.app.stage.addChild(echoModel);

      // 4. Initial layout alignment
      this.resetTransform(false);
      console.log('🌸😈 [AISA Live2D] Exactly 1 Harmony and 1 Echo initialized on stage!');
    } catch (e) {
      console.warn('[AISA Live2D] Failed loading models:', e);
    }
  },

  updateModelsLayout() {
    if (!this.app || !this.app.renderer) return;

    const rw = (this.app.renderer.width) / (this.app.renderer.resolution || 1);
    const rh = (this.app.renderer.height) / (this.app.renderer.resolution || 1);

    const isDuo = this.currentMode === 'duo';
    const isStudio = this.isLiveStudio;

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

    // 1. Layout for Harmony 🌸
    if (this.models.harmony) {
      if (isDuo) {
        this.models.harmony.visible = true;
        const scaleVal = isStudio ? this.mascots.harmony.duoStudioScale : this.mascots.harmony.duoMiniScale;
        this.models.harmony.scale.set(scaleVal * this.zoomFactor);

        if (this.models.harmony.customX !== undefined && this.models.harmony.customY !== undefined) {
          this.models.harmony.position.set(this.models.harmony.customX, this.models.harmony.customY);
        } else {
          const defaultX = isStudio ? (rw * 0.34) : (rw * 0.30);
          const defaultY = isStudio ? (rh * 0.56 + this.mascots.harmony.yOffset) : (rh * 0.52 + this.mascots.harmony.yOffset);
          this.models.harmony.position.set(defaultX + this.stagePan.x, defaultY + this.stagePan.y);
        }
      } else if (this.currentMode === 'harmony') {
        this.models.harmony.visible = true;
        const scaleVal = isStudio ? this.mascots.harmony.studioScale : this.mascots.harmony.miniScale;
        this.models.harmony.scale.set(scaleVal * this.zoomFactor);

        if (this.models.harmony.customX !== undefined && this.models.harmony.customY !== undefined) {
          this.models.harmony.position.set(this.models.harmony.customX, this.models.harmony.customY);
        } else {
          const defaultX = rw * 0.5;
          const defaultY = isStudio ? (rh * 0.56 + this.mascots.harmony.yOffset) : (rh * 0.52 + this.mascots.harmony.yOffset);
          this.models.harmony.position.set(defaultX + this.stagePan.x, defaultY + this.stagePan.y);
        }
      } else {
        this.models.harmony.visible = false;
      }
    }

    // 2. Layout for Echo 😈
    if (this.models.echo) {
      if (isDuo) {
        this.models.echo.visible = true;
        const scaleVal = isStudio ? this.mascots.echo.duoStudioScale : this.mascots.echo.duoMiniScale;
        this.models.echo.scale.set(scaleVal * this.zoomFactor);

        if (this.models.echo.customX !== undefined && this.models.echo.customY !== undefined) {
          this.models.echo.position.set(this.models.echo.customX, this.models.echo.customY);
        } else {
          const defaultX = isStudio ? (rw * 0.66) : (rw * 0.70);
          const defaultY = isStudio ? (rh * 0.56 + this.mascots.echo.yOffset) : (rh * 0.52 + this.mascots.echo.yOffset);
          this.models.echo.position.set(defaultX + this.stagePan.x, defaultY + this.stagePan.y);
        }
      } else if (this.currentMode === 'echo') {
        this.models.echo.visible = true;
        const scaleVal = isStudio ? this.mascots.echo.studioScale : this.mascots.echo.miniScale;
        this.models.echo.scale.set(scaleVal * this.zoomFactor);

        if (this.models.echo.customX !== undefined && this.models.echo.customY !== undefined) {
          this.models.echo.position.set(this.models.echo.customX, this.models.echo.customY);
        } else {
          const defaultX = rw * 0.5;
          const defaultY = isStudio ? (rh * 0.56 + this.mascots.echo.yOffset) : (rh * 0.52 + this.mascots.echo.yOffset);
          this.models.echo.position.set(defaultX + this.stagePan.x, defaultY + this.stagePan.y);
        }
      } else {
        this.models.echo.visible = false;
      }
    }
  },

  bindInteractions(canvas) {
    // Distance-based model hit identification (immune to 4096px transparent bounding boxes)
    const getHitModel = (pointerPos) => {
      const isHarmonyVisible = this.models.harmony && this.models.harmony.visible;
      const isEchoVisible = this.models.echo && this.models.echo.visible;

      const rw = this.app.screen.width;
      const rh = this.app.screen.height;

      // Duo mode: determine closest active character within interaction threshold
      if (isHarmonyVisible && isEchoVisible) {
        const dH = Math.hypot(pointerPos.x - this.models.harmony.x, pointerPos.y - this.models.harmony.y);
        const dE = Math.hypot(pointerPos.x - this.models.echo.x, pointerPos.y - this.models.echo.y);
        const maxDist = Math.max(160, Math.min(rw, rh) * 0.52);

        if (dH < dE && dH < maxDist) {
          return 'harmony';
        } else if (dE <= dH && dE < maxDist) {
          return 'echo';
        }
        return 'stage';
      }

      // Single Harmony mode
      if (isHarmonyVisible) {
        const dH = Math.hypot(pointerPos.x - this.models.harmony.x, pointerPos.y - this.models.harmony.y);
        const maxDist = Math.max(180, Math.min(rw, rh) * 0.60);
        if (dH < maxDist) return 'harmony';
        return 'stage';
      }

      // Single Echo mode
      if (isEchoVisible) {
        const dE = Math.hypot(pointerPos.x - this.models.echo.x, pointerPos.y - this.models.echo.y);
        const maxDist = Math.max(180, Math.min(rw, rh) * 0.60);
        if (dE < maxDist) return 'echo';
        return 'stage';
      }

      return 'stage';
    };

    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = this.app.screen.width / (rect.width || 1);
      const scaleY = this.app.screen.height / (rect.height || 1);
      const pointerPos = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };

      this.activeDragTarget = getHitModel(pointerPos);
      this.dragStartPointer = { x: e.clientX, y: e.clientY };
      this.hasDragged = false;

      if (this.activeDragTarget === 'harmony' && this.models.harmony) {
        // Bring active character to front
        this.app.stage.addChild(this.models.harmony);
        this.dragStartModelPos = { x: this.models.harmony.x, y: this.models.harmony.y };
      } else if (this.activeDragTarget === 'echo' && this.models.echo) {
        // Bring active character to front
        this.app.stage.addChild(this.models.echo);
        this.dragStartModelPos = { x: this.models.echo.x, y: this.models.echo.y };
      } else {
        this.dragStartModelPos = { x: this.stagePan.x, y: this.stagePan.y };
      }

      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    });

    canvas.addEventListener('pointermove', (e) => {
      if (this.activeDragTarget) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = this.app.screen.width / (rect.width || 1);
        const scaleY = this.app.screen.height / (rect.height || 1);
        const dx = (e.clientX - this.dragStartPointer.x) * scaleX;
        const dy = (e.clientY - this.dragStartPointer.y) * scaleY;

        if (Math.hypot(dx, dy) > 4) {
          this.hasDragged = true;
        }

        if (this.activeDragTarget === 'harmony' && this.models.harmony) {
          this.models.harmony.customX = this.dragStartModelPos.x + dx;
          this.models.harmony.customY = this.dragStartModelPos.y + dy;
          this.models.harmony.position.set(this.models.harmony.customX, this.models.harmony.customY);
        } else if (this.activeDragTarget === 'echo' && this.models.echo) {
          this.models.echo.customX = this.dragStartModelPos.x + dx;
          this.models.echo.customY = this.dragStartModelPos.y + dy;
          this.models.echo.position.set(this.models.echo.customX, this.models.echo.customY);
        } else {
          this.stagePan.x = this.dragStartModelPos.x + dx;
          this.stagePan.y = this.dragStartModelPos.y + dy;
          this.updateModelsLayout();
        }
      } else {
        // Natural eye tracking on hover
        if (this.models.harmony && this.models.harmony.visible && typeof this.models.harmony.focus === 'function') {
          this.models.harmony.focus(e.clientX, e.clientY);
        }
        if (this.models.echo && this.models.echo.visible && typeof this.models.echo.focus === 'function') {
          this.models.echo.focus(e.clientX, e.clientY);
        }
      }
    });

    const onPointerUp = (e) => {
      if (this.activeDragTarget && !this.hasDragged) {
        // User clicked/tapped without dragging: trigger interactive voice dialogue & animation
        if (this.activeDragTarget === 'harmony' || this.activeDragTarget === 'echo') {
          this.onModelClick(this.activeDragTarget);
        }
      }
      this.activeDragTarget = null;
      this.hasDragged = false;
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    };

    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    // Scroll Wheel to Zoom
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? 0.92 : 1.08;
      this.zoomFactor = Math.max(0.4, Math.min(3.5, this.zoomFactor * zoomDelta));
      this.updateModelsLayout();
    }, { passive: false });
  },

  resetTransform(notify = true) {
    this.stagePan = { x: 0, y: 0 };
    this.zoomFactor = 1.0;
    if (this.models.harmony) {
      delete this.models.harmony.customX;
      delete this.models.harmony.customY;
    }
    if (this.models.echo) {
      delete this.models.echo.customX;
      delete this.models.echo.customY;
    }
    this.updateModelsLayout();
    if (notify) {
      this.showSpeechBubble('Đã đặt lại góc nhìn mặc định! ✨', 2000);
    }
  },

  setMode(mode) {
    this.currentMode = mode || 'duo';
    // Clear individual drag coordinates when switching modes so they align beautifully
    if (this.models.harmony) {
      delete this.models.harmony.customX;
      delete this.models.harmony.customY;
    }
    if (this.models.echo) {
      delete this.models.echo.customX;
      delete this.models.echo.customY;
    }
    this.updateModelsLayout();

    // Synchronize top pills in header if available
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === this.currentMode);
    });
    if (window.AisaApp && window.AisaApp.state && window.AisaApp.state.mode !== this.currentMode) {
      window.AisaApp.state.mode = this.currentMode;
      if (typeof window.AisaApp.saveState === 'function') window.AisaApp.saveState();
      if (typeof window.AisaApp.updateModelBadge === 'function') window.AisaApp.updateModelBadge();
    }
  },

  switchMascot() {
    // Cycles: duo -> harmony -> echo -> duo
    if (this.currentMode === 'duo') {
      this.setMode('harmony');
      this.showSpeechBubble('Chỉ riêng Harmony đồng hành cùng cậu nè! 🌸', 2500, 'harmony');
    } else if (this.currentMode === 'harmony') {
      this.setMode('echo');
      this.showSpeechBubble('Tới lượt Echo chiếm trọn sân khấu rồi! 😈', 2500, 'echo');
    } else {
      this.setMode('duo');
      this.showSpeechBubble('Cả hai em cùng Song Hành nhé Master! 🌸😈', 2500, 'duo');
    }
  },

  toggleLiveStudio() {
    this.isLiveStudio = !this.isLiveStudio;
    const container = document.getElementById('live2d-stage-container');
    const headerBtn = document.getElementById('btn-toggle-live-studio');

    // Remove any leftover inline styles
    if (container) {
      container.removeAttribute('style');
    }

    if (this.isLiveStudio) {
      if (container) container.classList.add('live-studio-mode');
      document.body.classList.add('live-studio-active');
      if (headerBtn) headerBtn.classList.add('active');
      setTimeout(() => {
        this.resizeForLiveStudio();
        this.showSpeechBubble('Chào mừng Master Yurika đến với Gemini Live Studio! 🌸😈', 3500);
      }, 50);
    } else {
      if (container) container.classList.remove('live-studio-mode');
      document.body.classList.remove('live-studio-active');
      if (headerBtn) headerBtn.classList.remove('active');
      setTimeout(() => {
        if (this.app && this.app.renderer) {
          this.app.renderer.resize(280, 338);
        }
        this.resetTransform(false);
      }, 50);
    }
  },

  resizeForLiveStudio() {
    if (!this.app || !this.app.renderer) return;
    const wrap = document.querySelector('.live2d-canvas-wrap');
    const isWide = window.innerWidth > 900;
    const targetWidth = wrap && wrap.clientWidth > 300 ? wrap.clientWidth : (isWide ? (window.innerWidth - 420) : window.innerWidth);
    const targetHeight = wrap && wrap.clientHeight > 200 ? wrap.clientHeight : (isWide ? (window.innerHeight - 54) : Math.floor(window.innerHeight * 0.5));

    this.app.renderer.resize(targetWidth, targetHeight);
    this.resetTransform(false);
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
      ? [
          'Cậu cần em hỗ trợ gì nè? 🌸',
          'Sakura ngoan, giữ gìn sức khỏe nha! ✨',
          'Em luôn ở bên cạnh lắng nghe cậu nè! 💖',
          'Đừng quên uống nước và nghỉ ngơi một chút nhé! 🍵'
        ]
      : [
          'Ê, chọc tớ hoài coi chừng bị chê deadline nha! 😈',
          'Bớt bấm lung tung đi nào, tập trung vào việc đi! 😏',
          'Cần Echo ra tay vặn vẹo ai hong? Cứ nói một tiếng! ⚔️',
          'Lại kiếm chuyện với tớ hả? Thích thì chiều nha! ⚡'
        ];
    const randomMsg = cheers[Math.floor(Math.random() * cheers.length)];
    this.showSpeechBubble(randomMsg, 3000, speaker);

    // Speak with Vietnamese female voice
    if (window.AisaVoice && typeof window.AisaVoice.speak === 'function') {
      window.AisaVoice.speak(randomMsg, speaker);
    }

    const targetModel = this.models[speaker];
    if (targetModel && typeof targetModel.expression === 'function') {
      try {
        const randExp = Math.floor(Math.random() * 6);
        targetModel.expression(randExp);
      } catch (e) {}
    }
  }
};

// Safe fallback auto-initialize on DOM ready strictly once
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (window.AisaLive2D && !window.AisaLive2D.isInitialized && !window.AisaLive2D.isInitializing) {
      window.AisaLive2D.init();
    }
  }, 350);
});
