/**
 * AISA COMPANION - VOICE & AMBIENCE SYNTHESIZER
 * Web Speech API + Web Audio API Engine
 * Features: Barge-in Speech Interruption, Live2D Lip-sync hooks, Emotion event emission
 */
window.AisaVoice = {
  synth: window.speechSynthesis,
  recognition: null,
  isListening: false,
  isSpeaking: false,
  currentSpeakingElement: null,
  currentSpeakingSpeaker: 'HARMONY',
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
    console.log(`🌸 [AISA Voice] Loaded ${this.voices.length} system voices.`);
  },

  getBestVoice(speaker = 'HARMONY') {
    if (!this.voices || !this.voices.length) {
      this.loadVoices();
    }
    const voices = this.voices || [];
    if (!voices.length) return null;

    // 1. Tìm giọng tiếng Việt (vi-VN)
    const viVoices = voices.filter(v => 
      (v.lang && (v.lang.toLowerCase().startsWith('vi') || v.lang.toLowerCase().includes('vi-vn'))) ||
      v.name.toLowerCase().includes('vietnam') || 
      v.name.toLowerCase().includes('tiếng việt')
    );

    if (viVoices.length > 0) {
      // Ưu tiên giọng nữ ngọt ngào tự nhiên (Microsoft HoaiMy, Google tiếng Việt, v.v.)
      const femaleVi = viVoices.find(v => {
        const n = v.name.toLowerCase();
        return n.includes('hoaimy') || n.includes('female') || n.includes('google') || n.includes('linh') || n.includes('mai');
      });

      if (speaker.toUpperCase() === 'HARMONY') {
        return femaleVi || viVoices[0];
      } else {
        // Echo: nếu có giọng khác thì chọn, hoặc cùng giọng nhưng tăng cao độ
        const otherVi = viVoices.find(v => v !== femaleVi) || femaleVi || viVoices[0];
        return otherVi;
      }
    }

    // 2. Dự phòng: Nếu Windows chưa cài gói tiếng Việt, TUYỆT ĐỐI chọn giọng NỮ (Natural / Female / Jenny / Zira)
    // Không bao giờ để rơi vào giọng nam tiếng Anh trầm (David / Mark)
    const femaleFallback = voices.find(v => {
      const n = v.name.toLowerCase();
      return (n.includes('female') || n.includes('natural') || n.includes('jenny') || n.includes('aria') || n.includes('zira') || n.includes('ayumi')) &&
             !n.includes('male') && !n.includes('david') && !n.includes('mark') && !n.includes('george');
    });

    return femaleFallback || voices[0];
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
      // 🛑 BARGE-IN: Nếu AI đang phát giọng nói, ngắt lời ngay lập tức!
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
      // 🛑 BARGE-IN: Ngắt lời ngay khi người dùng chủ động bật mic nói
      this.interruptSpeech();
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

  /**
   * 🛑 BARGE-IN: Ngắt giọng nói đang phát tức thì khi người dùng chen ngang
   */
  interruptSpeech() {
    if (this.isSpeaking && this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;

      // Dừng Lip-sync trên Live2D Mascot
      if (window.AisaLive2D && typeof window.AisaLive2D.stopLipSync === 'function') {
        window.AisaLive2D.stopLipSync();
      }

      // Đánh dấu huy hiệu ngắt lời vào tin nhắn đang nói dở
      if (this.currentSpeakingElement) {
        const bubble = this.currentSpeakingElement.closest('.message-bubble') || this.currentSpeakingElement;
        if (bubble && !bubble.querySelector('.chat-interrupted-badge')) {
          const badge = document.createElement('div');
          badge.className = 'chat-interrupted-badge';
          badge.innerHTML = `<span>🛑</span><span>[Đã ngắt lời khi người dùng phản hồi]</span>`;
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
    if (!this.synth) return;

    if (this.isSpeaking) {
      this.interruptSpeech();
      return;
    }

    this.synth.cancel(); // Dừng câu đang đọc trước đó
    this.currentSpeakingElement = messageElement;
    this.currentSpeakingSpeaker = speaker;
    this.isSpeaking = true;

    // 1. Phát hiện cảm xúc đầu tiên để gửi event animation Live2D / Avatar
    const emoMatch = text.match(/\[(joy|smile|blush|smirk|pout|think|surprised|crying|anger|caring|gentle)\]/i);
    if (emoMatch) {
      const emotion = emoMatch[1].toLowerCase();
      window.dispatchEvent(new CustomEvent('aisa-emotion', {
        detail: { speaker, emotion }
      }));
    }

    // 2. Kích hoạt Lip-sync trên Live2D Mascot (truyền rõ nhân vật đang nói)
    const speakerKey = (speaker || '').toLowerCase().includes('echo') ? 'echo' : 'harmony';
    if (window.AisaLive2D && typeof window.AisaLive2D.startLipSync === 'function') {
      window.AisaLive2D.startLipSync(speakerKey);
    }

    // 3. Lọc bỏ hoàn toàn các thẻ suy nghĩ nội tâm <think>...</think>
    let cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '');

    // 4. Lọc bỏ các thẻ cảm xúc [joy], [smirk]... và thẻ ghi nhớ [LEARN: ...]
    cleanText = cleanText.replace(/\[(joy|smile|blush|smirk|pout|think|surprised|crying|anger|caring|gentle)\]/gi, '');
    cleanText = cleanText.replace(/\[LEARN:[\s\S]*?\]/gi, '');

    // 5. Lọc bỏ công thức KaTeX và ký tự markdown thô để đọc trơn tru
    cleanText = cleanText
      .replace(/\$\$[\s\S]*?\$\$/g, 'công thức toán học')
      .replace(/\\\[[\s\S]*?\\\]/g, 'công thức toán học')
      .replace(/\$([^\$\n]+?)\$/g, '$1')
      .replace(/\\\(([\s\S]*?)\\\)/g, '$1')
      .replace(/[*#_~`[\]()]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    if (!cleanText) {
      this.isSpeaking = false;
      if (window.AisaLive2D) window.AisaLive2D.stopLipSync();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const chosenVoice = this.getBestVoice(speaker);

    if (chosenVoice) {
      utterance.voice = chosenVoice;
      utterance.lang = chosenVoice.lang || 'vi-VN';
    } else {
      utterance.lang = 'vi-VN';
    }

    // Điều chỉnh cao độ và tốc độ theo chất giọng anime nữ
    if (speaker.toUpperCase() === 'HARMONY') {
      utterance.pitch = 1.22; // Nữ tính, trong trẻo, ngọt ngào
      utterance.rate = 1.0;
    } else {
      utterance.pitch = 1.12; // Tiểu quỷ cá tính, lém lỉnh, hơi nhanh
      utterance.rate = 1.06;
    }

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentSpeakingElement = null;
      if (window.AisaLive2D) window.AisaLive2D.stopLipSync();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.currentSpeakingElement = null;
      if (window.AisaLive2D) window.AisaLive2D.stopLipSync();
    };

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
      } catch (e) { }
    }
    this.isAmbientPlaying = false;
  }
};
