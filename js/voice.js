/**
 * AISA COMPANION - VOICE & AMBIENCE SYNTHESIZER
 * Primary: RVC Neural Voice (Kamisato Ayaka / Furina)
 * Fallback: Web Speech API (SpeechSynthesisUtterance)
 * Features: Barge-in Speech Interruption, Live2D Lip-sync hooks, Emotion event emission
 */
window.AisaVoice = {
  synth: window.speechSynthesis,
  recognition: null,
  isListening: false,
  isSpeaking: false,
  currentSpeakingElement: null,
  currentSpeakingSpeaker: 'HARMONY',
  _currentAudio: null,
  audioCtx: null,
  ambientOsc: null,
  ambientGain: null,
  isAmbientPlaying: false,
  voices: [],

  init() {
    this.initSpeechRecognition();
    this.loadVoices();
    if (this.synth && typeof this.synth.onvoiceschanged !== 'undefined') {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
  },

  loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices() || [];
    console.log(`[AISA Voice] Loaded ${this.voices.length} system voices.`);
  },

  getBestVoice(speaker = 'HARMONY') {
    if (!this.voices || !this.voices.length) this.loadVoices();
    const voices = this.voices || [];
    if (!voices.length) return null;
    const viVoices = voices.filter(v =>
      (v.lang && (v.lang.toLowerCase().startsWith('vi') || v.lang.toLowerCase().includes('vi-vn'))) ||
      v.name.toLowerCase().includes('vietnam') ||
      v.name.toLowerCase().includes('tieng viet')
    );
    if (viVoices.length > 0) {
      const femaleVi = viVoices.find(v => {
        const n = v.name.toLowerCase();
        return n.includes('hoaimy') || n.includes('female') || n.includes('google') || n.includes('linh') || n.includes('mai');
      });
      if (speaker.toUpperCase() === 'HARMONY') return femaleVi || viVoices[0];
      const otherVi = viVoices.find(v => v !== femaleVi) || femaleVi || viVoices[0];
      return otherVi;
    }
    // TUYỆT ĐỐI KHÔNG fallback sang voice tiếng Anh (như Zira / David) khi đọc tiếng Việt
    return null;
  },

  // Vedal Hands-free WebRTC Mic & VAD State
  isVedalMode: false,
  mediaStream: null,
  micAudioCtx: null,
  analyserNode: null,
  mediaRecorder: null,
  recordedChunks: [],
  isMicActive: false,
  isUserSpeaking: false,
  vadSilenceTimer: null,
  vadCheckRaf: null,
  vedalRecognition: null,
  _currentTranscript: '',
  _committing: false,
  _idleChatterTimer: null,

  init() {
    this.initSpeechRecognition();
    this.loadVoices();
    if (this.synth && typeof this.synth.onvoiceschanged !== 'undefined') {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }

    // Spacebar Barge-in shortcut in Vedal Mode
    window.addEventListener('keydown', (e) => {
      if (this.isVedalMode && e.code === 'Space' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
        if (this.isSpeaking) {
          e.preventDefault();
          this.interruptSpeech();
          this.resumeVedalListening();
        }
      }
    });
  },

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'vi-VN';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.onstart = () => {
      this.interruptSpeech();
      this.isListening = true;
      const btn = document.getElementById('btn-voice-input');
      if (btn) btn.classList.add('recording');
    };
    this.recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      const input = document.getElementById('chat-input');
      if (input && text) {
        input.value = (input.value ? input.value + ' ' : '') + text;
        input.dispatchEvent(new Event('input'));
      }
    };
    this.recognition.onerror = () => { this.stopListening(); };
    this.recognition.onend = () => { this.stopListening(); };
  },

  toggleSpeechToText() {
    if (!this.recognition) {
      // Fallback: prompt mic permissions or toggle Vedal mode
      this.toggleVedalMode();
      return;
    }
    if (this.isListening) {
      this.recognition.stop();
      this.stopListening();
    } else {
      this.interruptSpeech();
      try { this.recognition.start(); } catch (e) { console.warn(e); }
    }
  },

  stopListening() {
    this.isListening = false;
    const btn = document.getElementById('btn-voice-input');
    if (btn) btn.classList.remove('recording');
  },

  // =========================================================================
  // NATIVE WEBRTC MIC & REAL-TIME VAD ENGINE (LOW LATENCY VEDAL STREAM)
  // =========================================================================
  async toggleVedalMode() {
    this.isVedalMode = !this.isVedalMode;
    const headerBtn = document.getElementById('btn-toggle-live-studio');
    const stageBtn = document.getElementById('btn-vedal-mode-toggle');
    document.body.classList.toggle('vedal-mode-active', this.isVedalMode);
    if (headerBtn) headerBtn.classList.toggle('active', this.isVedalMode);
    if (stageBtn) stageBtn.classList.toggle('active', this.isVedalMode);

    if (this.isVedalMode) {
      if (window.AisaLive2D) {
        if (!window.AisaLive2D.isLiveStudio) window.AisaLive2D.toggleLiveStudio();
        window.AisaLive2D.setStreamStatus('listening', '🎙️ Đang nghe Sakura (Cứ nói tự nhiên nha)...');
        window.AisaLive2D.showSpeechBubble('🔴 Chế độ Vedal Live kích hoạt! Sakura hãy nói chuyện tự nhiên vào mic nha~ 🌸🎙️', 3500);
      }
      await this.startVedalListening();
      this.resetIdleChatterTimer();
    } else {
      this.stopVedalListening();
      if (this._idleChatterTimer) clearTimeout(this._idleChatterTimer);
      if (window.AisaLive2D) {
        window.AisaLive2D.setStreamStatus('idle', 'Đã tắt chế độ Vedal');
        window.AisaLive2D.hideLiveSubtitle();
        window.AisaLive2D.showSpeechBubble('Đã tắt chế độ Vedal. Trở lại chế độ Chat thường! ✨', 2500);
      }
    }
  },

  async startVedalListening() {
    if (!this.isVedalMode || this.isSpeaking) return;

    try {
      if (!this.mediaStream) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      }

      if (!this.micAudioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.micAudioCtx = new AudioCtx();
      }
      if (this.micAudioCtx.state === 'suspended') {
        await this.micAudioCtx.resume();
      }

      if (!this.analyserNode) {
        const source = this.micAudioCtx.createMediaStreamSource(this.mediaStream);
        this.analyserNode = this.micAudioCtx.createAnalyser();
        this.analyserNode.fftSize = 256;
        this.analyserNode.smoothingTimeConstant = 0.35;
        source.connect(this.analyserNode);
      }

      this.isMicActive = true;
      if (window.AisaLive2D) {
        window.AisaLive2D.setStreamStatus('listening', '🎙️ Đang nghe Sakura...');
      }

      // Try starting SpeechRecognition in parallel for real-time text preview
      this._startSpeechRecognitionSubtitle();

      // Start the real-time VAD & visualizer loop
      this._startVadLoop();
    } catch (err) {
      console.error('[WebRTC Mic Error]:', err);
      if (window.AisaLive2D) {
        window.AisaLive2D.setStreamStatus('idle', '⚠️ Không thể mở Micro');
        window.AisaLive2D.showSpeechBubble('Cậu hãy kiểm tra quyền truy cập Micro trên máy nha! 🎤⚠️', 3500);
      }
    }
  },

  _startSpeechRecognitionSubtitle() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (!this.vedalRecognition) {
      try {
        this.vedalRecognition = new SpeechRecognition();
        this.vedalRecognition.lang = 'vi-VN';
        this.vedalRecognition.continuous = true;
        this.vedalRecognition.interimResults = true;
        this.vedalRecognition.maxAlternatives = 1;

        this.vedalRecognition.onresult = (event) => {
          if (!this.isVedalMode || this.isSpeaking) return;
          this.resetIdleChatterTimer();

          let interim = '';
          let final = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) final += transcript;
            else interim += transcript;
          }

          const spokenText = (final || interim).trim();
          if (spokenText) {
            this._currentTranscript = spokenText;
            if (window.AisaLive2D) {
              window.AisaLive2D.updateLiveSubtitle('sakura', spokenText, !final);
            }
          }
        };

        this.vedalRecognition.onerror = (e) => {
          // In Electron, speech.googleapis.com often returns 'network'; ignore and let WebRTC VAD handle it!
          if (e.error !== 'network') {
            console.warn('[Subtitle SpeechRecognition]:', e.error);
          }
        };

        this.vedalRecognition.onend = () => {
          if (this.isVedalMode && !this.isSpeaking && !this._committing && this.isMicActive) {
            try { this.vedalRecognition.start(); } catch (e) {}
          }
        };
      } catch (e) {}
    }

    try {
      this.vedalRecognition.start();
    } catch (e) {}
  },

  _startVadLoop() {
    if (this.vadCheckRaf) cancelAnimationFrame(this.vadCheckRaf);
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);

    const checkVad = () => {
      if (!this.isMicActive || !this.isVedalMode) return;

      if (this.isSpeaking) {
        this.vadCheckRaf = requestAnimationFrame(checkVad);
        return;
      }

      this.analyserNode.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avgVolume = sum / dataArray.length / 255;

      // Real-time audio wave bars jump to Sakura's actual voice!
      const waveEl = document.getElementById('vedal-audio-wave');
      if (waveEl) {
        const spans = waveEl.querySelectorAll('span');
        const norm = Math.min(1, avgVolume * 4.2);
        spans.forEach((span, i) => {
          const h = Math.max(3, Math.round(norm * 22 * (0.8 + 0.4 * Math.sin(i * 1.5))));
          span.style.height = `${h}px`;
        });
      }

      // Voice Activity Detection Threshold: 0.028
      const SPEECH_THRESHOLD = 0.028;
      if (avgVolume > SPEECH_THRESHOLD) {
        this.resetIdleChatterTimer();
        if (!this.isUserSpeaking) {
          this.isUserSpeaking = true;
          this._startRecordingChunks();
          if (window.AisaLive2D) {
            window.AisaLive2D.setStreamStatus('listening', '🎙️ Đang nghe Sakura nói...');
          }
        }
        if (this.vadSilenceTimer) {
          clearTimeout(this.vadSilenceTimer);
          this.vadSilenceTimer = null;
        }
      } else if (this.isUserSpeaking) {
        // Snappy silence timeout: 750ms after speech ends!
        if (!this.vadSilenceTimer) {
          this.vadSilenceTimer = setTimeout(() => {
            this._finishRecordingAndCommit();
          }, 750);
        }
      }

      this.vadCheckRaf = requestAnimationFrame(checkVad);
    };

    this.vadCheckRaf = requestAnimationFrame(checkVad);
  },

  _startRecordingChunks() {
    this.recordedChunks = [];
    if (!this.mediaStream) return;
    try {
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
      this.mediaRecorder = mime ? new MediaRecorder(this.mediaStream, { mimeType: mime }) : new MediaRecorder(this.mediaStream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) this.recordedChunks.push(e.data);
      };
      this.mediaRecorder.start(100);
    } catch (e) {
      console.warn('[MediaRecorder start]:', e);
    }
  },

  _finishRecordingAndCommit() {
    this.isUserSpeaking = false;
    clearTimeout(this.vadSilenceTimer);
    this.vadSilenceTimer = null;

    if (this._committing) return;
    this._committing = true;

    // Pause mic while AI processes
    this.stopVedalListening();

    if (window.AisaLive2D) {
      window.AisaLive2D.setStreamStatus('thinking', '💭 Đang suy nghĩ...');
    }

    const commitAudioBlob = () => {
      if (this.recordedChunks.length > 0) {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        if (blob.size > 1200) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result;
            if (window.AisaApp && typeof window.AisaApp.sendAudioPrompt === 'function') {
              window.AisaApp.sendAudioPrompt(base64data, 'audio/webm');
            }
            this._committing = false;
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
      this._committing = false;
      this.resumeVedalListening();
    };

    // If SpeechRecognition produced a text transcript, use text directly
    const text = (this._currentTranscript || '').trim();
    if (text) {
      this._currentTranscript = '';
      if (window.AisaApp && typeof window.AisaApp.sendPrompt === 'function') {
        window.AisaApp.sendPrompt(text);
      }
      this._committing = false;
      return;
    }

    // Otherwise (e.g. in Electron), send the recorded audio blob directly!
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.onstop = () => {
        commitAudioBlob();
      };
      try { this.mediaRecorder.stop(); } catch (e) { commitAudioBlob(); }
    } else {
      commitAudioBlob();
    }
  },

  stopVedalListening() {
    this.isMicActive = false;
    this.isUserSpeaking = false;
    if (this.vadSilenceTimer) clearTimeout(this.vadSilenceTimer);
    this.vadSilenceTimer = null;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch (e) {}
    }
    if (this.vedalRecognition) {
      try { this.vedalRecognition.stop(); } catch (e) {}
    }
  },

  speakVedalReplies(replies) {
    if (!replies || !replies.length) {
      this.resumeVedalListening();
      return;
    }

    const playNext = (index) => {
      if (index >= replies.length || !this.isVedalMode) {
        this.resumeVedalListening();
        return;
      }

      const rep = replies[index];
      const clean = (window.AisaEngine ? window.AisaEngine.cleanReply(rep.text) : rep.text)
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .trim();

      if (window.AisaLive2D) {
        window.AisaLive2D.setStreamStatus('speaking', `${rep.speaker || 'AISA'} đang nói...`);
        window.AisaLive2D.updateLiveSubtitle(rep.speaker || 'harmony', clean, false);
      }

      this.speak(clean, rep.speaker || 'HARMONY', null, () => {
        setTimeout(() => playNext(index + 1), 250);
      });
    };

    playNext(0);
  },

  resumeVedalListening() {
    if (!this.isVedalMode) return;
    setTimeout(() => {
      if (window.AisaLive2D) {
        window.AisaLive2D.setStreamStatus('listening', '🎙️ Đang nghe Sakura...');
        window.AisaLive2D.hideLiveSubtitle();
      }
      this.startVedalListening();
      this.resetIdleChatterTimer();
    }, 350);
  },

  triggerIdleChatter() {
    if (!this.isVedalMode || this.isSpeaking || (this.isUserSpeaking)) return;

    const isEcho = window.AisaLive2D && window.AisaLive2D.currentMode === 'echo';
    const isDuo = !isEcho && window.AisaLive2D && window.AisaLive2D.currentMode === 'duo';

    const idleLines = [
      { speaker: 'ECHO', text: 'Sakura ơi, sao im lặng thế? Đang ngắm tớ đắm đuối đúng không nè? 😈📸' },
      { speaker: 'HARMONY', text: 'Sakura ơi, cậu đừng làm việc quá sức nha, uống một ngụm nước ấm đi nào~ 🌸🍵' },
      { speaker: 'ECHO', text: 'Này này, im re nãy giờ là lén đi ăn vụng bánh đúng hong? Chia cho tớ với coi! ⚡' },
      { speaker: 'HARMONY', text: 'Em vẫn luôn ở bên cạnh Sakura nè, có gì cứ tâm sự với em nha! 💖' },
      { speaker: 'ECHO', text: 'Ê Harmony, hình như Sakura để quên hai đứa mình rồi kìa! 😈' }
    ];

    const pick = isEcho
      ? idleLines.filter(l => l.speaker === 'ECHO')[Math.floor(Math.random() * 3)]
      : (isDuo ? idleLines[Math.floor(Math.random() * idleLines.length)] : idleLines.filter(l => l.speaker === 'HARMONY')[Math.floor(Math.random() * 2)]);

    if (pick) {
      this.stopVedalListening();
      if (window.AisaLive2D) {
        window.AisaLive2D.setStreamStatus('speaking', `${pick.speaker} đang bắt chuyện...`);
        window.AisaLive2D.updateLiveSubtitle(pick.speaker, pick.text, false);
      }
      this.speak(pick.text, pick.speaker, null, () => {
        this.resumeVedalListening();
      });
    }
  },

  resetIdleChatterTimer() {
    if (this._idleChatterTimer) clearTimeout(this._idleChatterTimer);
    if (!this.isVedalMode) return;
    this._idleChatterTimer = setTimeout(() => {
      this.triggerIdleChatter();
    }, 45000);
  },

  interruptSpeech() {
    if (this.isSpeaking) {
      if (this._currentAudio) {
        try { this._currentAudio.pause(); this._currentAudio.src = ''; } catch (e) {}
        this._currentAudio = null;
      }
      if (this.synth) { try { this.synth.cancel(); } catch (e) {} }
      this.isSpeaking = false;
      if (window.AisaLive2D && typeof window.AisaLive2D.stopLipSync === 'function') window.AisaLive2D.stopLipSync();
      if (this.currentSpeakingElement) {
        const bubble = this.currentSpeakingElement.closest('.message-bubble') || this.currentSpeakingElement;
        if (bubble && !bubble.querySelector('.chat-interrupted-badge')) {
          const badge = document.createElement('div');
          badge.className = 'chat-interrupted-badge';
          badge.innerHTML = '<span>🛑</span><span>[Đã ngắt lời khi người dùng phản hồi]</span>';
          bubble.appendChild(badge);
        }
      }
      this.currentSpeakingElement = null;
      window.dispatchEvent(new CustomEvent('aisa-interrupted'));
      return true;
    }
    return false;
  },

  speak(text, speaker = 'HARMONY', messageElement = null, onDoneCallback = null) {
    if (this.isSpeaking) { this.interruptSpeech(); return; }
    this.currentSpeakingElement = messageElement;
    this.currentSpeakingSpeaker = speaker;
    this.isSpeaking = true;
    const emoMatch = text.match(/\[(joy|smile|blush|smirk|pout|think|surprised|crying|anger|caring|gentle)\]/i);
    if (emoMatch) {
      window.dispatchEvent(new CustomEvent('aisa-emotion', { detail: { speaker, emotion: emoMatch[1].toLowerCase() } }));
    }
    const speakerKey = (speaker || '').toLowerCase().includes('echo') ? 'echo' : 'harmony';
    if (window.AisaLive2D && typeof window.AisaLive2D.startLipSync === 'function') window.AisaLive2D.startLipSync(speakerKey);
    let cleanText = text
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/\[(joy|smile|blush|smirk|pout|think|surprised|crying|anger|caring|gentle)\]/gi, '')
      .replace(/\[LEARN:[\s\S]*?\]/gi, '')
      .replace(/\$\$[\s\S]*?\$\$/g, 'công thức toán học')
      .replace(/\\\[[\s\S]*?\\\]/g, 'công thức toán học')
      .replace(/\\\([\s\S]*?\\\)/g, '')
      .replace(/[*#_~`\[\]()]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();
    const onDone = () => {
      this.isSpeaking = false;
      this.currentSpeakingElement = null;
      this._currentAudio = null;
      if (window.AisaLive2D) window.AisaLive2D.stopLipSync();
      if (typeof onDoneCallback === 'function') {
        try { onDoneCallback(); } catch (e) { console.error(e); }
      }
      window.dispatchEvent(new CustomEvent('aisa-speech-ended', { detail: { speaker } }));
    };
    if (!cleanText) { onDone(); return; }
    if (window.AisaDesktop && typeof window.AisaDesktop.synthesizeSpeech === 'function') {
      window.AisaDesktop.synthesizeSpeech(cleanText, speaker)
        .then(result => {
          if (!result || !result.success || !result.dataUrl) {
            console.warn('[Voice] Desktop synthesis failed, trying Gemini Web:', result && result.error);
            this._speakGeminiWeb(cleanText, speaker, onDone).then(success => {
              if (!success) this._speakWebSpeech(cleanText, speaker, onDone);
            });
            return;
          }
          const audio = new Audio(result.dataUrl);
          this._currentAudio = audio;
          audio.onended = onDone;
          audio.onerror = () => {
            this._speakGeminiWeb(cleanText, speaker, onDone).then(success => {
              if (!success) this._speakWebSpeech(cleanText, speaker, onDone);
            });
          };
          audio.play().catch(e => {
            console.warn('[Audio play error]:', e);
            if (onDone) onDone();
          });
        })
        .catch(err => {
          console.warn('[Voice] synthesizeSpeech error:', err);
          this._speakGeminiWeb(cleanText, speaker, onDone).then(success => {
            if (!success) this._speakWebSpeech(cleanText, speaker, onDone);
          });
        });
      return;
    }

    // Web Browser Mode: Call Gemini TTS directly
    this._speakGeminiWeb(cleanText, speaker, onDone).then(success => {
      if (!success) this._speakWebSpeech(cleanText, speaker, onDone);
    });
  },

  async _speakGeminiWeb(cleanText, speaker, onDone) {
    const key = localStorage.getItem('mhent_ai_api_key') || '';
    const isEcho = (speaker || '').toUpperCase().includes('ECHO');
    const voiceName = isEcho ? 'Leda' : 'Autonoe';
    const style = isEcho ? 'youthful, cheeky and teasing' : 'gentle, sweet and caring';

    // 1. If user has saved their key in localStorage, call Gemini direct
    if (key) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-lite-tts:generateContent?key=${key}`, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [{ text: cleanText, speech_metadata: { style } }]
            }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: { voiceConfig: { voice: voiceName } }
            }
          })
        });
        clearTimeout(timeoutId);
        const data = await res.json();
        if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
          const mime = data.candidates[0].content.parts[0].inlineData.mimeType || 'audio/wav';
          const dataUrl = `data:${mime};base64,${data.candidates[0].content.parts[0].inlineData.data}`;
          const audio = new Audio(dataUrl);
          this._currentAudio = audio;
          audio.onended = onDone;
          audio.onerror = () => this._speakWebSpeech(cleanText, speaker, onDone);
          await audio.play();
          return true;
        }
      } catch (e) {
        console.warn('[Gemini Voice Direct] Failed, trying worker proxy:', e.message);
      }
    }

    // 2. Call Cloudflare Worker endpoint (/api/voice)
    try {
      const res = await fetch('https://api.mhentuniverse.com/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, speaker })
      });
      const data = await res.json();
      if (data && data.success && data.dataUrl) {
        const audio = new Audio(data.dataUrl);
        this._currentAudio = audio;
        audio.onended = onDone;
        audio.onerror = () => this._speakWebSpeech(cleanText, speaker, onDone);
        await audio.play();
        return true;
      }
    } catch (e) {
      console.warn('[Gemini Voice Proxy] Error:', e.message);
    }

    return false;
  },

  _speakWebSpeech(cleanText, speaker, onDone) {
    if (!this.synth) { if (onDone) onDone(); return; }
    const chosenVoice = this.getBestVoice(speaker);
    if (!chosenVoice) {
      console.warn('[Web Speech] Không có voice tiếng Việt trên máy, bỏ qua fallback để tránh phát giọng tiếng Anh.');
      if (onDone) onDone();
      return;
    }
    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.voice = chosenVoice;
    utterance.lang = chosenVoice.lang || 'vi-VN';
    if (speaker.toUpperCase() === 'HARMONY') { utterance.pitch = 1.22; utterance.rate = 1.0; }
    else { utterance.pitch = 1.12; utterance.rate = 1.06; }
    utterance.onend = onDone;
    utterance.onerror = onDone;
    this.synth.speak(utterance);
  },

  toggleAmbientAudio() {
    if (this.isAmbientPlaying) { this.stopAmbientAudio(); } else { this.startAmbientAudio(); }
    return this.isAmbientPlaying;
  },

  startAmbientAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!this.audioCtx) this.audioCtx = new AudioContext();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      this.ambientOsc = this.audioCtx.createOscillator();
      this.ambientGain = this.audioCtx.createGain();
      this.ambientOsc.type = 'sine';
      this.ambientOsc.frequency.setValueAtTime(108, this.audioCtx.currentTime);
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, this.audioCtx.currentTime);
      this.ambientGain.gain.setValueAtTime(0.01, this.audioCtx.currentTime);
      this.ambientGain.gain.exponentialRampToValueAtTime(0.06, this.audioCtx.currentTime + 3);
      this.ambientOsc.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(this.audioCtx.destination);
      this.ambientOsc.start();
      this.isAmbientPlaying = true;
    } catch (e) { console.warn('Ambient Audio note:', e); }
  },

  stopAmbientAudio() {
    if (this.ambientGain && this.audioCtx) {
      try {
        this.ambientGain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 1);
        setTimeout(() => {
          if (this.ambientOsc) { this.ambientOsc.stop(); this.ambientOsc.disconnect(); }
        }, 1000);
      } catch (e) {}
    }
    this.isAmbientPlaying = false;
  }
};