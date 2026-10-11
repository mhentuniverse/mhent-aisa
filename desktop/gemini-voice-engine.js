/**
 * AISA GEMINI VOICE ENGINE (Desktop Edition)
 * Native Gemini Speech Generation Engine.
 * 
 * - HARMONY 🌸 -> Autonoe (Sweet, youthful, gentle, caring)
 * - ECHO 😈    -> Leda (Anime tsundere, lively, playful, teasing)
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const TTS_MODEL = 'gemini-3.8-flash-lite-tts';
const FALLBACK_MODEL = 'gemini-3.8-flash-tts';

// Persona voice & style mapping
const VOICE_CONFIGS = {
  HARMONY: {
    voice: 'Autonoe',
    style: 'gentle, sweet and caring',
    displayName: 'Harmony (Autonoe)'
  },
  ECHO: {
    voice: 'Leda',
    style: 'youthful, cheeky and teasing',
    displayName: 'Echo (Leda)'
  }
};

// In-memory audio cache for frequent phrases (e.g., greetings, short reactions)
const audioCache = new Map();
const MAX_CACHE_SIZE = 50;

/**
 * Resolve Gemini API Key securely without exposing in git
 */
function getApiKey(options = {}) {
  if (options.apiKey) return options.apiKey;
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;

  try {
    const keysPath = path.resolve(__dirname, '../data/keys.json');
    if (fs.existsSync(keysPath)) {
      const data = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
      if (data && data.GEMINI_API_KEY) return data.GEMINI_API_KEY;
    }
  } catch (e) {}

  return '';
}

/**
 * Clean text for voice generation
 */
function cleanTextForSpeech(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/\[(joy|smile|blush|smirk|pout|think|surprised|crying|anger|caring|gentle)\]/gi, '')
    .replace(/\[LEARN:[\s\S]*?\]/gi, '')
    .replace(/\$\$[\s\S]*?\$\$/g, 'công thức toán')
    .replace(/\\\[[\s\S]*?\\\]/g, 'công thức toán')
    .replace(/\\\([\s\S]*?\\\)/g, '')
    .replace(/[*#_~`\[\]()]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .trim();
}

/**
 * Synthesize speech using Gemini Speech Generation
 * @param {string} rawText 
 * @param {string} speaker 'HARMONY' | 'ECHO'
 * @param {object} options { apiKey, style }
 * @returns {Promise<string|null>} Data URL (data:audio/wav;base64,...)
 */
async function synthesizeSpeech(rawText, speaker = 'HARMONY', options = {}) {
  const text = cleanTextForSpeech(rawText);
  if (!text) return null;

  const apiKey = getApiKey(options);
  if (!apiKey) {
    console.warn('[Gemini Voice] No GEMINI_API_KEY found in options, process.env or data/keys.json');
    return null;
  }

  const speakerKey = (speaker || '').toUpperCase().includes('ECHO') ? 'ECHO' : 'HARMONY';
  const cfg = VOICE_CONFIGS[speakerKey] || VOICE_CONFIGS.HARMONY;
  const style = options.style || cfg.style;

  // Check cache
  const cacheKey = `${speakerKey}:${crypto.createHash('md5').update(text).digest('hex')}`;
  if (audioCache.has(cacheKey)) {
    console.log(`[Gemini Voice] Cache hit for ${speakerKey}: "${text.slice(0, 30)}..."`);
    return audioCache.get(cacheKey);
  }

  const payload = {
    contents: [{
      role: 'user',
      parts: [{
        text: text,
        speech_metadata: { style }
      }]
    }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { voice: cfg.voice }
      }
    }
  };

  // Helper to call API
  async function callTTS(modelName) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
      const b64 = data.candidates[0].content.parts[0].inlineData.data;
      const mime = data.candidates[0].content.parts[0].inlineData.mimeType || 'audio/wav';
      return `data:${mime};base64,${b64}`;
    }
    throw new Error(data.error?.message || `HTTP ${res.status}`);
  }

  try {
    console.log(`[Gemini Voice] Synthesizing for ${cfg.displayName}: "${text.slice(0, 40)}..."`);
    let dataUrl = null;
    try {
      dataUrl = await callTTS(TTS_MODEL);
    } catch (errPrimary) {
      console.warn(`[Gemini Voice] ${TTS_MODEL} failed (${errPrimary.message}), trying fallback...`);
      dataUrl = await callTTS(FALLBACK_MODEL);
    }

    if (dataUrl) {
      // Store in LRU cache
      if (audioCache.size >= MAX_CACHE_SIZE) {
        const firstKey = audioCache.keys().next().value;
        audioCache.delete(firstKey);
      }
      audioCache.set(cacheKey, dataUrl);
      return dataUrl;
    }
    return null;
  } catch (err) {
    console.error(`[Gemini Voice] Synthesis failed:`, err.message);
    return null;
  }
}

module.exports = {
  synthesizeSpeech,
  VOICE_CONFIGS,
  cleanTextForSpeech,
  getApiKey
};
