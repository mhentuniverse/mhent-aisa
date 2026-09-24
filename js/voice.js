/**
 * AISA COMPANION - VOICE & AMBIENCE SYNTHESIZER
 * Web Speech API + Web Audio API Engine
 */
window.AisaVoice = {
  synth: window.speechSynthesis,
  recognition: null,
  isListening: false,
  audioCtx: null,
  ambientOsc: null,
  ambientGain: null,
  isAmbientPlaying: false,

  init() {
    this.initSpeechRecognition();
  },

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.log('Speech recognition not supported in this browser.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'vi-VN';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;

    this.recognition.onstart = () => {
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

    this.recognition.onerror = (e) => {
      console.warn('Voice recognition error:', e.error);
      this.stopListening();
    };

    this.recognition.onend = () => {
      this.stopListening();
    };
  },

  toggleSpeechToText() {
    if (!this.recognition) {
      alert('Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói tiếng Việt trực tiếp.');
      return;
    }
    if (this.isListening) {
      this.recognition.stop();
      this.stopListening();
    } else {
      try {
        this.recognition.start();
      } catch (e) {
        console.warn(e);
      }
    }
  },

  stopListening() {
    this.isListening = false;
    const btn = document.getElementById('btn-voice-input');
    if (btn) btn.classList.remove('recording');
  },

  speak(text, speaker = 'HARMONY') {
    if (!this.synth) return;
    this.synth.cancel(); // Dừng câu đang đọc trước đó

    // Lọc bỏ ký tự markdown thô để đọc tự nhiên
    const cleanText = text
      .replace(/[*#_~`[\]()]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'vi-VN';

    // Điều chỉnh cao độ và tốc độ theo nhân cách
    if (speaker === 'HARMONY') {
      utterance.pitch = 1.15; // Giọng trong, ngọt ngào, ấm áp
      utterance.rate = 0.95;
    } else {
      utterance.pitch = 0.9;  // Giọng cá tính, hơi tinh nghịch
      utterance.rate = 1.05;
    }

    this.synth.speak(utterance);
  },

  // --------------------------------------------------------------------------
  // BỘ PHÁT ÂM THANH MÔI TRƯỜNG THIỀN ĐỊNH / CYBER AMBIENCE (WEB AUDIO API)
  // --------------------------------------------------------------------------
  toggleAmbientAudio() {
    if (this.isAmbientPlaying) {
      this.stopAmbientAudio();
    } else {
      this.startAmbientAudio();
    }
    return this.isAmbientPlaying;
  },

  startAmbientAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!this.audioCtx) this.audioCtx = new AudioContext();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      // Tạo sóng âm tần số 432Hz thư giãn
      this.ambientOsc = this.audioCtx.createOscillator();
      this.ambientGain = this.audioCtx.createGain();

      this.ambientOsc.type = 'sine';
      this.ambientOsc.frequency.setValueAtTime(108, this.audioCtx.currentTime); // Âm trầm dịu êm

      // Filter tạo độ ấm
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
    } catch (e) {
      console.warn('Ambient Audio note:', e);
    }
  },

  stopAmbientAudio() {
    if (this.ambientGain && this.audioCtx) {
      try {
        this.ambientGain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 1);
        setTimeout(() => {
          if (this.ambientOsc) {
            this.ambientOsc.stop();
            this.ambientOsc.disconnect();
          }
        }, 1000);
      } catch (e) {}
    }
    this.isAmbientPlaying = false;
  }
};
