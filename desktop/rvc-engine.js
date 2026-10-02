/**
 * AISA RVC (Retrieval-based Voice Conversion) Engine
 * - Persona Harmony -> Kamisato Ayaka (ayaka-rmvpe.pth)
 * - Persona Echo -> Furina (furina_rmvpe.pth)
 * 
 * Flow:
 * 1. Text input -> Base Speech generator (Local Piper / FPT.AI)
 * 2. Audio -> Local RVC Inference Server (localhost:5055) with RTX 4050 GPU
 * 3. Output -> Converted Ayaka / Furina voice audio (base64 / dataUrl)
 */

const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const RVC_SERVER_PORT = 5055;
const candidateDirs = [
  path.resolve(__dirname, '../../model voice'),
  path.resolve(__dirname, '../model voice'),
  path.resolve(process.cwd(), 'model voice'),
  path.resolve(process.cwd(), '../model voice')
];
const MODEL_VOICE_DIR = candidateDirs.find(d => fs.existsSync(d)) || candidateDirs[0];

// Config mapping for each persona
const VOICE_MODELS = {
  HARMONY: {
    name: 'Kamisato Ayaka',
    model: 'ayaka-rmvpe.pth',
    index: 'added_IVF1228_Flat_nprobe_1_kamisato_ayaka_v2.index',
    pitch: 0 // semitone shift
  },
  ECHO: {
    name: 'Furina',
    model: 'furina_rmvpe.pth',
    index: 'added_IVF1203_Flat_nprobe_1_furina_rmvpe_v2.index',
    pitch: 0
  }
};

let serverProcess = null;

/**
 * Check if local voice server is running, auto-spawn if needed
 */
function ensureServerRunning() {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${RVC_SERVER_PORT}/health`, (res) => {
      if (res.statusCode === 200) return resolve(true);
      resolve(false);
    });
    req.on('error', () => {
      const pythonExe = path.resolve(__dirname, '../voice-server/.venv/Scripts/python.exe');
      const serverScript = path.resolve(__dirname, '../voice-server/server.py');
      if (fs.existsSync(pythonExe) && fs.existsSync(serverScript)) {
        console.log('[RVC Engine] Spawning local voice server...');
        serverProcess = spawn(pythonExe, [serverScript], {
          cwd: path.resolve(__dirname, '../voice-server'),
          stdio: 'ignore',
          detached: true
        });
        serverProcess.unref();
        setTimeout(() => resolve(true), 2500);
      } else {
        resolve(false);
      }
    });
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Check if voice models exist on disk
 */
function checkModelsAvailable() {
  const status = {
    folder: MODEL_VOICE_DIR,
    harmony: false,
    echo: false
  };

  try {
    const harmonyModel = path.join(MODEL_VOICE_DIR, VOICE_MODELS.HARMONY.model);
    const echoModel = path.join(MODEL_VOICE_DIR, VOICE_MODELS.ECHO.model);
    status.harmony = fs.existsSync(harmonyModel);
    status.echo = fs.existsSync(echoModel);
  } catch (err) {
    console.warn('[RVC] Error checking model files:', err.message);
  }

  return status;
}

/**
 * Synthesize speech via RVC pipeline
 * @param {string} text 
 * @param {string} speaker 'HARMONY' | 'ECHO'
 * @param {object} options 
 * @returns {Promise<string|null>} Data URL (audio/wav or audio/mp3)
 */
async function synthesizeSpeech(text, speaker = 'HARMONY', options = {}) {
  const speakerKey = (speaker || 'HARMONY').toUpperCase();
  const config = VOICE_MODELS[speakerKey] || VOICE_MODELS.HARMONY;

  // Make sure server is up
  await ensureServerRunning();

  return new Promise((resolve) => {
    const postData = JSON.stringify({
      text,
      speaker: speakerKey,
      model: config.model,
      index: config.index,
      pitch: options.pitch !== undefined ? options.pitch : config.pitch
    });

    const req = http.request({
      hostname: '127.0.0.1',
      port: RVC_SERVER_PORT,
      path: '/synthesize',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 60000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.success && json.dataUrl) {
            resolve(json.dataUrl);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.warn(`[RVC Engine] RVC Server error: ${err.message}`);
      resolve(null);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.write(postData);
    req.end();
  });
}

module.exports = {
  synthesizeSpeech,
  ensureServerRunning,
  checkModelsAvailable,
  VOICE_MODELS
};
