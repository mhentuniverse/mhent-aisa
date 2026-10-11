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
    const femaleFallback = voices.find(v => {
      const n = v.name.toLowerCase();
      return (n.includes('female') || n.includes('natural') || n.includes('jenny') || n.includes('aria') || n.includes('zira') || n.includes('ayumi')) &&
             !n.includes('male') && !n.includes('david') && !n.includes('mark') && !n.includes('george');
    });
    return femaleFallback || voices[0];
  },

  // Vedal Hands-free Loop State
  isVedalMode: false,
  vedalRecognition: null,
  vedalListeningActive: false,
  _silenceTimer: null,
  _idleChatterTimer: null,
  _currentTranscript: '',
  _committing: false,

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
    if (!SpeechRecognition) { console.log('Speech recognition not supported.'); return; }
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
    this.recognition.onerror = (e) => { console.warn('Voice recognition error:', e.error); this.stopListening(); };
    this.recognition.onend = () => { this.stopListening(); };
  },

  toggleSpeechToText() {
    if (!this.recognition) { alert('Trinh duyet chua ho tro nhan dien giong noi tieng Viet.'); return; }
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
  // VEDAL HANDS-FREE VTUBER CONTINUOUS VOICE LOOP (NEURO-SAMA STYLE)
  // =========================================================================
  toggleVedalMode() {
    this.isVedalMode = !this.isVedalMode;
    const headerBtn = document.getElementById('btn-toggle-live-studio');
    const stageBtn = document.getElementById('btn-vedal-mode-toggle');
    document.body.classList.toggle('vedal-mode-active', this.isVedalMode);
    if (headerBtn) headerBtn.classList.toggle('active', this.isVedalMode);
    if (stageBtn) stageBtn.classList.toggle('active', this.isVedalMode);

    if (this.isVedalMode) {
      // Ensure Live Studio is visible and full stage
      if (window.AisaLive2D) {
        if (!window.AisaLive2D.isLiveStudio) window.AisaLive2D.toggleLiveStudio();
        window.AisaLive2D.setStreamStatus('listening', '🎙️ Đang nghe Sakura (Cứ nói tự nhiên nha)...');
        window.AisaLive2D.showSpeechBubble('🔴 Chế độ Vedal Live kích hoạt! Sakura hãy nói chuyện tự nhiên vào mic nha~ 🌸🎙️', 3500);
      }
      this.startVedalListening();
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

  startVedalListening() {
    if (!this.isVedalMode || this.isSpeaking) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[Vedal] Speech recognition not supported in this environment.');
      return;
    }

    if (!this.vedalRecognition) {
      this.vedalRecognition = new SpeechRecognition();
      this.vedalRecognition.lang = 'vi-VN';
      this.vedalRecognition.continuous = true;
      this.vedalRecognition.interimResults = true;
      this.vedalRecognition.maxAlternatives = 1;

      this.vedalRecognition.onstart = () => {
        this.vedalListeningActive = true;
        if (window.AisaLive2D) window.AisaLive2D.setStreamStatus('listening', '🎙️ Đang nghe Sakura...');
      };

      this.vedalRecognition.onresult = (event) => {
        if (!this.isVedalMode || this.isSpeaking) return;
        this.resetIdleChatterTimer();

        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        const spokenText = (final || interim).trim();
        if (spokenText) {
          this._currentTranscript = spokenText;
          if (window.AisaLive2D) {
            window.AisaLive2D.updateLiveSubtitle('sakura', spokenText, !final);
          }

          // Silence detection: commit prompt when user pauses
          clearTimeout(this._silenceTimer);
          this._silenceTimer = setTimeout(() => {
            this._commitVedalSpeech();
          }, final ? 900 : 1400);
        }
      };

      this.vedalRecognition.onerror = (e) => {
        console.warn('[Vedal Voice] recognition error:', e.error);
        if (e.error === 'not-allowed') {
          this.isVedalMode = false;
          alert('Vui lòng cấp quyền Microphone để AISA có thể lắng nghe cậu nha!');
          return;
        }
        if (this.isVedalMode && !this.isSpeaking && !this._committing) {
          setTimeout(() => this.startVedalListening(), 500);
        }
      };

      this.vedalRecognition.onend = () => {
        this.vedalListeningActive = false;
        if (this.isVedalMode && !this.isSpeaking && !this._committing) {
          setTimeout(() => this.startVedalListening(), 350);
        }
      };
    }

    try {
      this.vedalRecognition.start();
    } catch (e) {
      // Ignore if already listening
    }
  },

  stopVedalListening() {
    this.vedalListeningActive = false;
    clearTimeout(this._silenceTimer);
    if (this.vedalRecognition) {
      try { this.vedalRecognition.stop(); } catch (e) {}
    }
  },

  _commitVedalSpeech() {
    const text = (this._currentTranscript || '').trim();
    if (!text) return;
    this._currentTranscript = '';
    this._committing = true;

    // Stop mic while AI is reasoning and responding
    this.stopVedalListening();

    if (window.AisaLive2D) {
      window.AisaLive2D.setStreamStatus('thinking', '💭 Đang suy nghĩ...');
      window.AisaLive2D.updateLiveSubtitle('sakura', text, false);
    }

    if (window.AisaApp && typeof window.AisaApp.sendPrompt === 'function') {
      window.AisaApp.sendPrompt(text);
    }
    this._committing = false;
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
        setTimeout(() => playNext(index + 1), 350);
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
    }, 450);
  },

  triggerIdleChatter() {
    if (!this.isVedalMode || this.isSpeaking || (this.vedalListeningActive && this._currentTranscript)) return;

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
            console.warn('[Voice] Desktop synthesis failed, fallback to Gemini Web / Web Speech:', result && result.error);
            this._speakGeminiWeb(cleanText, speaker, onDone).then(success => {
              if (!success) this._speakWebSpeech(cleanText, speaker, onDone);
            });
            return;
          }
          const audio = new Audio(result.dataUrl);
          this._currentAudio = audio;
          audio.onended = onDone;
          audio.onerror = () => this._speakWebSpeech(cleanText, speaker, onDone);
          audio.play().catch(() => this._speakWebSpeech(cleanText, speaker, onDone));
        })
        .catch(() => {
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
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-lite-tts:generateContent?key=${key}`, {
          method: 'POST',
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
    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const chosenVoice = this.getBestVoice(speaker);
    if (chosenVoice) { utterance.voice = chosenVoice; utterance.lang = chosenVoice.lang || 'vi-VN'; }
    else { utterance.lang = 'vi-VN'; }
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