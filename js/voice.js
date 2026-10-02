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
          badge.innerHTML = '<span>&#x1F6D1;</span><span>[Da ngat loi khi nguoi dung phan hoi]</span>';
          bubble.appendChild(badge);
        }
      }
      this.currentSpeakingElement = null;
      window.dispatchEvent(new CustomEvent('aisa-interrupted'));
      return true;
    }
    return false;
  },

  speak(text, speaker = 'HARMONY', messageElement = null) {
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
      .replace(/\$\$[\s\S]*?\$\$/g, 'cong thuc toan hoc')
      .replace(/\\\[[\s\S]*?\\\]/g, 'cong thuc toan hoc')
      .replace(/\\\([\s\S]*?\\\)/g, '')
      .replace(/[*#_~`\[\]()]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();
    if (!cleanText) { this.isSpeaking = false; if (window.AisaLive2D) window.AisaLive2D.stopLipSync(); return; }
    const onDone = () => {
      this.isSpeaking = false;
      this.currentSpeakingElement = null;
      this._currentAudio = null;
      if (window.AisaLive2D) window.AisaLive2D.stopLipSync();
    };
    if (window.AisaDesktop && typeof window.AisaDesktop.synthesizeSpeech === 'function') {
      window.AisaDesktop.synthesizeSpeech(cleanText, speaker)
        .then(result => {
          if (!result || !result.success || !result.dataUrl) {
            console.warn('[Voice] Voice synthesis failed, fallback to Web Speech:', result && result.error);
            this._speakWebSpeech(cleanText, speaker, onDone);
            return;
          }
          const audio = new Audio(result.dataUrl);
          this._currentAudio = audio;
          audio.onended = onDone;
          audio.onerror = () => this._speakWebSpeech(cleanText, speaker, onDone);
          audio.play().catch(() => this._speakWebSpeech(cleanText, speaker, onDone));
        })
        .catch(() => this._speakWebSpeech(cleanText, speaker, onDone));
      return;
    }
    this._speakWebSpeech(cleanText, speaker, onDone);
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