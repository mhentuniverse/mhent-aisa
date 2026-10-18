/**
 * AISA COMPANION - LIVE2D MASCOT STAGE ENGINE (NEURO-SAMA PROCEDURAL VTUBER EDITION)
 * Features:
 * 1. Dual Mascot Display (Runami Yachiyo 🌸 & March 7th 😈)
 * 2. Role Swap (Yachiyo 🌸 ⇋ March 7th 😈 with 1 click 🎭)
 * 3. 60FPS Neuro-sama Procedural Life Engine:
 *    - Idle breathing & body sway
 *    - Independent natural eye blinking with occasional double-blinks
 *    - Talking head nod & tilt dynamics while speaking
 *    - Global window mouse tracking (Follows Sakura's mouse across the entire app)
 * 4. Harmonic Audio Lip-Sync (60FPS voice-reactive mouth opening)
 * 5. Gemini Live Studio View (Full stage theater mode + chat sidebar)
 * 6. Interactive Pan & Zoom, Dragging & Character Tapping
 * Miyazaki Haruto Entertainment Co., Ltd.
 */

window.AisaLive2D = {
  app: null,
  models: {
    harmony: null,
    echo: null
  },
  currentMode: 'duo', // 'duo' | 'harmony' | 'echo'
  pairingMode: 'yachiyo_march', // 'yachiyo_march' (Default) | 'march_yachiyo'
  isLipSyncing: false,
  lipSyncSpeaker: 'harmony',
  isVisible: true,
  isInitialized: false,
  isInitializing: false,
  isLiveStudio: false,
  bubbleTimeout: null,
  resizeObserver: null,

  // Transform State
  zoomFactor: 1.0,
  stagePan: { x: 0, y: 0 },
  activeDragTarget: null, // 'harmony' | 'echo' | 'stage' | null
  dragStartPointer: { x: 0, y: 0 },
  dragStartModelPos: { x: 0, y: 0 },
  hasDragged: false,

  // Eye Blink State Machine
  blinkState: {
    harmony: { nextBlink: 0, isBlinking: false, startTime: 0, duration: 150, isDouble: false },
    echo: { nextBlink: 0, isBlinking: false, startTime: 0, duration: 140, isDouble: false }
  },

  // Model Definitions
  AVAILABLE_MODELS: {
    yachiyo: {
      displayName: 'Yachiyo Kaguya-hime',
      path: 'assets/live2d-models/yachiyo_kaguya/【雪熊企划】八千代辉夜姬/八千代辉夜姬.model3.json',
      miniScale: 0.046,
      duoMiniScale: 0.036,
      studioScale: 0.096,
      duoStudioScale: 0.076,
      yOffset: 25,
      type: 'yachiyo'
    },
    march_7th: {
      displayName: 'March 7th',
      path: 'assets/live2d-models/march_7th/March 7th/march 7th.model3.json',
      miniScale: 0.096,
      duoMiniScale: 0.076,
      studioScale: 0.192,
      duoStudioScale: 0.152,
      yOffset: 25,
      type: 'march'
    }
  },

  mascots: {
    harmony: null,
    echo: null
  },

  updateMascotsConfig() {
    const saved = localStorage.getItem('aisa_mascot_pairing');
    if (saved && (saved === 'yachiyo_march' || saved === 'march_yachiyo')) {
      this.pairingMode = saved;
    }

    if (this.pairingMode === 'yachiyo_march') {
      this.mascots.harmony = {
        name: 'Harmony 🌸',
        ...this.AVAILABLE_MODELS.yachiyo,
        badgeColor: '#f472b6'
      };
      this.mascots.echo = {
        name: 'Echo 😈',
        ...this.AVAILABLE_MODELS.march_7th,
        badgeColor: '#a78bfa'
      };
    } else {
      this.mascots.harmony = {
        name: 'Harmony 🌸',
        ...this.AVAILABLE_MODELS.march_7th,
        badgeColor: '#f472b6'
      };
      this.mascots.echo = {
        name: 'Echo 😈',
        ...this.AVAILABLE_MODELS.yachiyo,
        badgeColor: '#a78bfa'
      };
    }
  },

  swapPairing() {
    this.pairingMode = (this.pairingMode === 'yachiyo_march') ? 'march_yachiyo' : 'yachiyo_march';
    localStorage.setItem('aisa_mascot_pairing', this.pairingMode);
    this.updateMascotsConfig();
    this.loadBothModels();

    const desc = this.pairingMode === 'yachiyo_march'
      ? 'Harmony 🌸: Yachiyo (Kaguya) | Echo 😈: March 7th'
      : 'Harmony 🌸: March 7th | Echo 😈: Yachiyo (Kaguya)';
    this.showSpeechBubble(`🎭 Đã đổi vai: ${desc}`, 3500);
  },

  async init() {
    if (this.isInitialized || this.isInitializing) return;
    this.isInitializing = true;

    this.updateMascotsConfig();

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

      // Initialize blink timers
      const now = Date.now();
      this.blinkState.harmony.nextBlink = now + 2500 + Math.random() * 2000;
      this.blinkState.echo.nextBlink = now + 2000 + Math.random() * 2500;

      // =========================================================================
      // 60FPS NEURO-SAMA PROCEDURAL ANIMATION & LIFE ENGINE
      // =========================================================================
      this.app.ticker.add(() => {
        const curTime = Date.now();
        const t = curTime / 1000;

        // 1. Natural Breathing & Idle Body Sway
        const breath = (Math.sin(t * 1.6) + 1) * 0.5;
        const bodySwayZ = Math.sin(t * 1.1) * 1.2;
        const bodySwayX = Math.sin(t * 0.85) * 0.9;

        // 2. Compute eye blink for each persona
        this.updateBlinks(curTime);

        // 3. Speaking dynamics
        const isSpeaking = this.isLipSyncing;
        const activeSpeaker = this.lipSyncSpeaker;

        ['harmony', 'echo'].forEach(spk => {
          const model = this.models[spk];
          if (!model || !model.visible || !model.internalModel) return;
          const core = model.internalModel.coreModel;
          if (!core) return;

          const setParam = (id, val) => {
            try {
              if (typeof core.setParameterValueById === 'function') {
                core.setParameterValueById(id, val);
              } else if (typeof core.setParamFloat === 'function') {
                core.setParamFloat(id, val);
              }
            } catch (e) {}
          };

          // Apply breathing
          setParam('ParamBreath', breath);
          setParam('PARAM_BREATH', breath);

          // Apply eye blinking
          const blinkVal = this.getBlinkValue(spk);
          setParam('ParamEyeLOpen', blinkVal);
          setParam('ParamEyeROpen', blinkVal);
          setParam('PARAM_EYE_L_OPEN', blinkVal);
          setParam('PARAM_EYE_R_OPEN', blinkVal);

          if (isSpeaking && activeSpeaker === spk) {
            // TALKING: dynamic head nod + tilt + mouth open
            const isEchoSpk = spk === 'echo';
            const nodY = Math.sin(t * 6.5) * (isEchoSpk ? 5.0 : 3.8);
            const tiltZ = Math.sin(t * 3.2) * (isEchoSpk ? 4.5 : 3.0);

            // Natural organic mouth modulation wave
            const mouthVal = 0.50 + 0.35 * Math.sin(curTime / 72) + 0.15 * Math.sin(curTime / 28);
            const clampedMouth = Math.max(0, Math.min(0.95, mouthVal));

            setParam('ParamAngleY', nodY);
            setParam('PARAM_ANGLE_Y', nodY);
            setParam('ParamAngleZ', tiltZ + bodySwayZ);
            setParam('PARAM_ANGLE_Z', tiltZ + bodySwayZ);

            setParam('ParamMouthOpenY', clampedMouth);
            setParam('PARAM_MOUTH_OPEN_Y', clampedMouth);
            setParam('ParamA', clampedMouth);
          } else {
            // IDLE: gentle swaying, mouth closed
            setParam('ParamAngleZ', bodySwayZ);
            setParam('PARAM_ANGLE_Z', bodySwayZ);
            setParam('ParamBodyAngleX', bodySwayX);
            setParam('PARAM_BODY_ANGLE_X', bodySwayX);

            setParam('ParamMouthOpenY', 0);
            setParam('PARAM_MOUTH_OPEN_Y', 0);
            setParam('ParamA', 0);
          }
        });
      });

      // Load both models
      await this.loadBothModels();

      // Bind canvas mouse/touch drag and tap
      this.bindInteractions(canvas);

      // Global window mouse tracking (Follow Sakura's mouse across the entire window!)
      window.addEventListener('pointermove', (e) => {
        if (!this.isVisible || this.activeDragTarget) return;
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;

        if (this.models.harmony && this.models.harmony.visible && typeof this.models.harmony.focus === 'function') {
          this.models.harmony.focus(canvasX, canvasY);
        }
        if (this.models.echo && this.models.echo.visible && typeof this.models.echo.focus === 'function') {
          this.models.echo.focus(canvasX, canvasY);
        }
      });

      // ResizeObserver
      if (window.ResizeObserver && !this.resizeObserver) {
        this.resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const w = Math.round(entry.contentRect.width);
            const h = Math.round(entry.contentRect.height);
            if (w > 50 && h > 50 && this.app && this.app.renderer) {
              if (Math.abs(this.app.screen.width - w) > 2 || Math.abs(this.app.screen.height - h) > 2) {
                this.app.renderer.resize(w, h);
                this.updateModelsLayout();
              }
            }
          }
        });
        const wrap = document.querySelector('.live2d-canvas-wrap');
        if (wrap) this.resizeObserver.observe(wrap);
      }

      window.addEventListener('resize', () => this.syncCanvasSize());

      // Bind Voice Events
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
      console.log('🌸 [AISA Live2D] Procedural Live2D VTuber Stage loaded with Yachiyo & March 7th!');
    } catch (err) {
      this.isInitializing = false;
      console.error('[AISA Live2D Error during init]:', err);
    }
  },

  updateBlinks(curTime) {
    ['harmony', 'echo'].forEach(spk => {
      const state = this.blinkState[spk];
      if (!state.isBlinking && curTime >= state.nextBlink) {
        state.isBlinking = true;
        state.startTime = curTime;
        state.duration = 135 + Math.random() * 30;
        state.isDouble = Math.random() < 0.22; // 22% chance of double blink
      } else if (state.isBlinking) {
        const elapsed = curTime - state.startTime;
        if (elapsed >= state.duration) {
          if (state.isDouble) {
            // Trigger rapid 2nd blink
            state.isDouble = false;
            state.startTime = curTime + 50;
            state.duration = 120;
          } else {
            state.isBlinking = false;
            state.nextBlink = curTime + 2600 + Math.random() * 2600;
          }
        }
      }
    });
  },

  getBlinkValue(spk) {
    const state = this.blinkState[spk];
    if (!state.isBlinking) return 1.0;
    const elapsed = Date.now() - state.startTime;
    if (elapsed < 0) return 1.0;
    const progress = Math.min(1.0, elapsed / state.duration);
    // Smooth blink curve: 1.0 -> 0.0 -> 1.0
    return Math.max(0, 1.0 - Math.sin(progress * Math.PI));
  },

  async loadBothModels() {
    if (!PIXI.live2d || !PIXI.live2d.Live2DModel) {
      console.warn('[AISA Live2D] Live2DModel not available in PIXI.');
      return;
    }

    try {
      if (this.app && this.app.stage) {
        while (this.app.stage.children.length > 0) {
          const child = this.app.stage.children[0];
          this.app.stage.removeChild(child);
          try { child.destroy({ children: true, texture: false, baseTexture: false }); } catch (e) {}
        }
      }
      this.models.harmony = null;
      this.models.echo = null;

      // 1. Load Harmony
      console.log(`🌸 [AISA Live2D] Loading Harmony (${this.mascots.harmony.name})...`);
      const harmonyModel = await PIXI.live2d.Live2DModel.from(this.mascots.harmony.path, { autoInteract: false });
      harmonyModel.anchor.set(0.5, 0.5);
      harmonyModel.interactive = false;
      this.models.harmony = harmonyModel;
      this.app.stage.addChild(harmonyModel);

      // 2. Load Echo
      console.log(`😈 [AISA Live2D] Loading Echo (${this.mascots.echo.name})...`);
      const echoModel = await PIXI.live2d.Live2DModel.from(this.mascots.echo.path, { autoInteract: false });
      echoModel.anchor.set(0.5, 0.5);
      echoModel.interactive = false;
      this.models.echo = echoModel;
      this.app.stage.addChild(echoModel);

      // Initial layout
      this.resetTransform(false);
      console.log('🌸😈 [AISA Live2D] Both new models initialized successfully!');
    } catch (e) {
      console.warn('[AISA Live2D] Failed loading new models:', e);
    }
  },

  syncCanvasSize() {
    if (!this.app || !this.app.renderer) return;
    const wrap = document.querySelector('.live2d-canvas-wrap');
    if (!wrap) return;

    let targetWidth = wrap.clientWidth;
    let targetHeight = wrap.clientHeight;

    if (this.isLiveStudio) {
      const isWide = window.innerWidth > 900;
      const expectedW = isWide ? (window.innerWidth - 420) : window.innerWidth;
      const expectedH = isWide ? (window.innerHeight - 54 - 46) : Math.floor(window.innerHeight * 0.5 - 46);
      if (!targetWidth || targetWidth < 300) targetWidth = expectedW;
      if (!targetHeight || targetHeight < 300) targetHeight = expectedH;
    } else {
      targetWidth = 280;
      targetHeight = 338;
    }

    this.app.renderer.resize(targetWidth, targetHeight);
    this.updateModelsLayout();
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
        titleEl.textContent = this.mascots.harmony.name;
        titleEl.style.color = '#f472b6';
      } else {
        titleEl.textContent = this.mascots.echo.name;
        titleEl.style.color = '#a78bfa';
      }
    }

    // 1. Layout Harmony
    if (this.models.harmony) {
      if (isDuo) {
        this.models.harmony.visible = true;
        const scaleVal = isStudio ? this.mascots.harmony.duoStudioScale : this.mascots.harmony.duoMiniScale;
        this.models.harmony.scale.set(scaleVal * this.zoomFactor);

        if (this.models.harmony.customX !== undefined && this.models.harmony.customY !== undefined) {
          this.models.harmony.position.set(this.models.harmony.customX, this.models.harmony.customY);
        } else {
          const defaultX = isStudio ? (rw * 0.35) : (rw * 0.30);
          const defaultY = isStudio ? (rh * 0.54 + this.mascots.harmony.yOffset) : (rh * 0.52 + this.mascots.harmony.yOffset);
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
          const defaultY = isStudio ? (rh * 0.54 + this.mascots.harmony.yOffset) : (rh * 0.52 + this.mascots.harmony.yOffset);
          this.models.harmony.position.set(defaultX + this.stagePan.x, defaultY + this.stagePan.y);
        }
      } else {
        this.models.harmony.visible = false;
      }
    }

    // 2. Layout Echo
    if (this.models.echo) {
      if (isDuo) {
        this.models.echo.visible = true;
        const scaleVal = isStudio ? this.mascots.echo.duoStudioScale : this.mascots.echo.duoMiniScale;
        this.models.echo.scale.set(scaleVal * this.zoomFactor);

        if (this.models.echo.customX !== undefined && this.models.echo.customY !== undefined) {
          this.models.echo.position.set(this.models.echo.customX, this.models.echo.customY);
        } else {
          const defaultX = isStudio ? (rw * 0.65) : (rw * 0.70);
          const defaultY = isStudio ? (rh * 0.54 + this.mascots.echo.yOffset) : (rh * 0.52 + this.mascots.echo.yOffset);
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
          const defaultY = isStudio ? (rh * 0.54 + this.mascots.echo.yOffset) : (rh * 0.52 + this.mascots.echo.yOffset);
          this.models.echo.position.set(defaultX + this.stagePan.x, defaultY + this.stagePan.y);
        }
      } else {
        this.models.echo.visible = false;
      }
    }
  },

  bindInteractions(canvas) {
    const getHitModel = (pointerPos) => {
      const isHarmonyVisible = this.models.harmony && this.models.harmony.visible;
      const isEchoVisible = this.models.echo && this.models.echo.visible;

      const rw = this.app.screen.width;
      const rh = this.app.screen.height;

      if (isHarmonyVisible && isEchoVisible) {
        const dH = Math.hypot(pointerPos.x - this.models.harmony.x, pointerPos.y - this.models.harmony.y);
        const dE = Math.hypot(pointerPos.x - this.models.echo.x, pointerPos.y - this.models.echo.y);
        const maxDist = Math.max(160, Math.min(rw, rh) * 0.52);

        if (dH < dE && dH < maxDist) return 'harmony';
        if (dE <= dH && dE < maxDist) return 'echo';
        return 'stage';
      }

      if (isHarmonyVisible) {
        const dH = Math.hypot(pointerPos.x - this.models.harmony.x, pointerPos.y - this.models.harmony.y);
        if (dH < Math.max(180, Math.min(rw, rh) * 0.60)) return 'harmony';
        return 'stage';
      }

      if (isEchoVisible) {
        const dE = Math.hypot(pointerPos.x - this.models.echo.x, pointerPos.y - this.models.echo.y);
        if (dE < Math.max(180, Math.min(rw, rh) * 0.60)) return 'echo';
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
        this.app.stage.addChild(this.models.harmony);
        this.dragStartModelPos = { x: this.models.harmony.x, y: this.models.harmony.y };
      } else if (this.activeDragTarget === 'echo' && this.models.echo) {
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
      }
    });

    const onPointerUp = (e) => {
      if (this.activeDragTarget && !this.hasDragged) {
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

    // Zoom
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? -0.06 : 0.06;
      this.zoomFactor = Math.max(0.4, Math.min(2.5, this.zoomFactor + zoomDelta));
      this.updateModelsLayout();
    }, { passive: false });
  },

  resetTransform(animated = true) {
    this.zoomFactor = 1.0;
    this.stagePan = { x: 0, y: 0 };
    if (this.models.harmony) {
      delete this.models.harmony.customX;
      delete this.models.harmony.customY;
    }
    if (this.models.echo) {
      delete this.models.echo.customX;
      delete this.models.echo.customY;
    }
    this.updateModelsLayout();
    if (animated) {
      this.showSpeechBubble('↺ Đã đặt lại góc nhìn!', 1500);
    }
  },

  switchMascot() {
    if (this.currentMode === 'duo') {
      this.currentMode = 'harmony';
    } else if (this.currentMode === 'harmony') {
      this.currentMode = 'echo';
    } else {
      this.currentMode = 'duo';
    }
    this.updateModelsLayout();
  },

  syncCanvasSize() {
    const container = document.getElementById('live2d-stage-container');
    const canvas = document.getElementById('live2d-canvas');
    if (!container || !canvas || !this.app) return;
    const wrap = container.querySelector('.live2d-canvas-wrap') || container;
    const rect = wrap.getBoundingClientRect();
    const w = Math.max(280, Math.floor(rect.width || 340));
    const h = Math.max(340, Math.floor(rect.height || 500));
    if (this.app.renderer) {
      this.app.renderer.resize(w, h);
    }
    canvas.width = w;
    canvas.height = h;
    this.updateModelsLayout();
  },

  toggleLiveStudio() {
    this.isLiveStudio = !this.isLiveStudio;
    const container = document.getElementById('live2d-stage-container');
    const headerBtn = document.getElementById('btn-toggle-live-studio') || document.getElementById('btn-toggle-gemini-live');

    if (this.isLiveStudio) {
      if (container) container.classList.add('live-studio-mode');
      document.body.classList.add('live-studio-active');
      if (headerBtn) headerBtn.classList.add('active');

      this.syncCanvasSize();
      this.resetTransform(false);
      requestAnimationFrame(() => this.syncCanvasSize());
      setTimeout(() => this.syncCanvasSize(), 120);

      this.showSpeechBubble('Chào mừng Sakura đến với Gemini Live Studio! 🌸😈', 3500);
    } else {
      if (container) container.classList.remove('live-studio-mode');
      document.body.classList.remove('live-studio-active');
      if (headerBtn) headerBtn.classList.remove('active');

      this.syncCanvasSize();
      this.resetTransform(false);
      requestAnimationFrame(() => this.syncCanvasSize());
      setTimeout(() => this.syncCanvasSize(), 120);
    }
  },

  setStreamStatus(status = 'listening', text = '') {
    const chip = document.getElementById('vedal-status-chip');
    if (!chip) return;
    chip.classList.remove('thinking', 'speaking');
    if (status === 'thinking') chip.classList.add('thinking');
    if (status === 'speaking') chip.classList.add('speaking');

    const iconEl = chip.querySelector('.vedal-status-icon');
    const textEl = chip.querySelector('.vedal-status-text');

    const icons = {
      listening: '🎙️',
      thinking: '💭',
      speaking: '🗣️',
      idle: '✨'
    };

    if (iconEl) iconEl.textContent = icons[status] || '🎙️';
    if (textEl) textEl.textContent = text || (status === 'listening' ? 'Đang lắng nghe Sakura...' : (status === 'thinking' ? 'Đang suy nghĩ...' : 'Đang trò chuyện...'));
  },

  updateLiveSubtitle(speaker = 'harmony', text = '', isInterim = false) {
    const banner = document.getElementById('vedal-subtitle-banner');
    if (!banner) return;
    if (!text || !text.trim()) {
      this.hideLiveSubtitle();
      return;
    }

    const isEcho = (speaker || '').toLowerCase().includes('echo');
    const isSakura = (speaker || '').toLowerCase().includes('sakura') || (speaker || '').toLowerCase().includes('user');

    const avatarEl = document.getElementById('vedal-sub-avatar');
    const nameEl = document.getElementById('vedal-sub-name');
    const textEl = document.getElementById('vedal-sub-text');
    const waveEl = document.getElementById('vedal-audio-wave');

    if (isSakura) {
      if (avatarEl) avatarEl.textContent = '🎙️';
      if (nameEl) { nameEl.textContent = 'Sakura'; nameEl.style.color = '#38bdf8'; }
    } else if (isEcho) {
      const charName = this.mascots && this.mascots.echo ? this.mascots.echo.name : 'Echo';
      if (avatarEl) avatarEl.textContent = '😈';
      if (nameEl) { nameEl.textContent = charName; nameEl.style.color = '#a78bfa'; }
    } else {
      const charName = this.mascots && this.mascots.harmony ? this.mascots.harmony.name : 'Harmony';
      if (avatarEl) avatarEl.textContent = '🌸';
      if (nameEl) { nameEl.textContent = charName; nameEl.style.color = '#f472b6'; }
    }

    if (textEl) {
      textEl.textContent = text;
      textEl.style.fontStyle = isInterim ? 'italic' : 'normal';
      textEl.style.opacity = isInterim ? '0.85' : '1.0';
    }

    if (waveEl) {
      waveEl.style.display = (isInterim || !isSakura) ? 'flex' : 'none';
    }

    banner.style.display = 'flex';

    if (this._subTimer) clearTimeout(this._subTimer);
    if (!isInterim && isSakura) {
      this._subTimer = setTimeout(() => this.hideLiveSubtitle(), 3500);
    }
  },

  hideLiveSubtitle() {
    const banner = document.getElementById('vedal-subtitle-banner');
    if (banner) banner.style.display = 'none';
  },

  setLiveStudio(enable) {
    if (this.isLiveStudio === !!enable) return;
    this.toggleLiveStudio();
  },

  toggleVisibility() {
    this.isVisible = !this.isVisible;
    const container = document.getElementById('live2d-stage-container');
    const toggleBtn = document.getElementById('btn-toggle-live2d');
    const topBtn = document.getElementById('btn-top-toggle-mascot');
    if (container) {
      if (this.isVisible) {
        container.classList.remove('hidden');
        if (toggleBtn) toggleBtn.classList.add('active');
        if (topBtn) topBtn.classList.add('active');
        if (!this.isInitialized) {
          this.init();
        } else {
          this.syncCanvasSize();
        }
      } else {
        container.classList.add('hidden');
        if (toggleBtn) toggleBtn.classList.remove('active');
        if (topBtn) topBtn.classList.remove('active');
        this.stopLipSync();
      }
    }
  },

  setEmotion(emotionKey, targetSpeaker = 'harmony') {
    const targetModel = targetSpeaker === 'echo' ? this.models.echo : this.models.harmony;
    if (!targetModel) return;

    const emo = (emotionKey || '').toLowerCase();
    const activeMascot = this.mascots[targetSpeaker];

    // Trigger specific animations & expressions per character
    try {
      if (activeMascot && activeMascot.type === 'march') {
        if (typeof targetModel.motion === 'function') {
          if (emo === 'joy' || emo === 'smile') targetModel.motion('Tap'); // Photo
          else targetModel.motion('Idle'); // Wink
        }
        if (typeof targetModel.expression === 'function') {
          const marchExp = { blush: 3, surprised: 7, crying: 5, anger: 4, smirk: 1 };
          if (marchExp[emo] !== undefined) targetModel.expression(marchExp[emo]);
        }
      } else if (activeMascot && activeMascot.type === 'yachiyo') {
        if (typeof targetModel.expression === 'function') {
          if (emo === 'joy' || emo === 'smile') targetModel.expression('笑咪咪');
          else if (emo === 'crying') targetModel.expression('眼泪');
          else if (emo === 'gentle' || emo === 'caring') targetModel.expression('眯眯眼');
        }
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
            core.setParameterValueById('ParamA', 0);
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
    const isHarmony = speaker === 'harmony';
    const activeMascot = this.mascots[speaker];

    const cheers = isHarmony
      ? [
          'Sakura ơi, có em ở đây rồi nè! 🌸',
          'Cậu đừng làm việc quá sức nha, uống một ngụm nước đi nào! ✨',
          'Em luôn dịu dàng lắng nghe Sakura mà! 💖',
          'Hôm nay cậu làm việc chăm chỉ lắm rồi đó! 🍵'
        ]
      : [
          'Này này Sakura, lại chọc ghẹo tớ nữa rồi đúng không! 😈',
          'Tớ là Echo đây! Có gì vui kể tớ nghe liền coi! 📸',
          'Đừng có lơ đãng nha, tập trung vào việc đi nào! ⚡',
          'Hí hí, thích trêu tớ hả? Coi chừng tớ chụp ảnh dìm đó nha! 💥'
        ];
    const randomMsg = cheers[Math.floor(Math.random() * cheers.length)];
    this.showSpeechBubble(randomMsg, 3000, speaker);

    // Speak with Vietnamese voice
    if (window.AisaVoice && typeof window.AisaVoice.speak === 'function') {
      window.AisaVoice.speak(randomMsg, speaker);
    }

    // Trigger animation
    const targetModel = this.models[speaker];
    if (targetModel) {
      try {
        if (activeMascot && activeMascot.type === 'march' && typeof targetModel.motion === 'function') {
          targetModel.motion('Tap'); // Take photo!
        } else if (activeMascot && activeMascot.type === 'yachiyo' && typeof targetModel.expression === 'function') {
          targetModel.expression('笑咪咪');
        }
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
