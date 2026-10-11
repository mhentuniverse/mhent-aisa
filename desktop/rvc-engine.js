/**
 * Forwarding shim to gemini-voice-engine.js
 * Old RVC engine has been decommissioned in favor of native Gemini Speech Generation.
 */

const geminiVoiceEngine = require('./gemini-voice-engine');

module.exports = {
  synthesizeSpeech: geminiVoiceEngine.synthesizeSpeech,
  ensureServerRunning: async () => true,
  checkModelsAvailable: () => ({ folder: 'gemini', harmony: true, echo: true }),
  VOICE_MODELS: geminiVoiceEngine.VOICE_CONFIGS
};
