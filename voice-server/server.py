"""
AISA Local Voice Server (Piper TTS + RVC Engine)
Runs on localhost:5055 to provide 100% offline voice synthesis for AISA Companion.
- Harmony 🌸 -> Kamisato Ayaka (ayaka-rmvpe.pth)
- Echo 😈 -> Furina (furina_rmvpe.pth)
"""

import os
import io
import wave
import base64
import json
import logging
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("aisa-voice")

app = FastAPI(title="AISA Voice Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent.parent
MODEL_VOICE_DIR = ROOT_DIR / "model voice"
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(exist_ok=True)

PIPER_MODEL_PATH = MODELS_DIR / "vi_VN-vivos-x_low.onnx"
PIPER_CONFIG_PATH = MODELS_DIR / "vi_VN-vivos-x_low.onnx.json"

# Voice model mapping
VOICE_MODELS = {
    "HARMONY": {
        "name": "Kamisato Ayaka",
        "model": MODEL_VOICE_DIR / "ayaka-rmvpe.pth",
        "index": MODEL_VOICE_DIR / "added_IVF1228_Flat_nprobe_1_kamisato_ayaka_v2.index",
        "default_pitch": 0,
    },
    "ECHO": {
        "name": "Furina",
        "model": MODEL_VOICE_DIR / "furina_rmvpe.pth",
        "index": MODEL_VOICE_DIR / "added_IVF1203_Flat_nprobe_1_furina_rmvpe_v2.index",
        "default_pitch": 0,
    },
}

# In-memory piper voice object
_piper_voice = None

@app.on_event("startup")
def startup_event():
    import threading
    def warmup():
        logger.info("Background warming up Piper and RVC models on GPU...")
        try:
            get_piper_voice()
            from rvc_wrapper import get_rvc_loader
            get_rvc_loader()
            logger.info("Models preloaded into GPU memory!")
        except Exception as e:
            logger.warning(f"Warmup error: {e}")
    threading.Thread(target=warmup, daemon=True).start()

def get_piper_voice():
    global _piper_voice
    if _piper_voice is None:
        if not PIPER_MODEL_PATH.exists() or not PIPER_CONFIG_PATH.exists():
            logger.warning(f"Piper model not found at {PIPER_MODEL_PATH}")
            return None
        try:
            from piper import PiperVoice
            _piper_voice = PiperVoice.load(str(PIPER_MODEL_PATH), config_path=str(PIPER_CONFIG_PATH))
            logger.info("Piper Vietnamese model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load Piper voice: {e}")
            return None
    return _piper_voice


class SynthesizeRequest(BaseModel):
    text: str
    speaker: str = "HARMONY"
    pitch: Optional[int] = 0
    fpt_key: Optional[str] = None


@app.get("/health")
def health():
    piper_ready = PIPER_MODEL_PATH.exists()
    harmony_model_ready = VOICE_MODELS["HARMONY"]["model"].exists()
    echo_model_ready = VOICE_MODELS["ECHO"]["model"].exists()

    return {
        "status": "ok",
        "piper_ready": piper_ready,
        "models": {
            "harmony": {
                "name": VOICE_MODELS["HARMONY"]["name"],
                "ready": harmony_model_ready,
                "model_path": str(VOICE_MODELS["HARMONY"]["model"]),
            },
            "echo": {
                "name": VOICE_MODELS["ECHO"]["name"],
                "ready": echo_model_ready,
                "model_path": str(VOICE_MODELS["ECHO"]["model"]),
            },
        },
    }


def synthesize_piper_wav(text: str) -> bytes:
    voice = get_piper_voice()
    if voice is None:
        raise HTTPException(status_code=500, detail="Piper model not loaded")

    wav_io = io.BytesIO()
    with wave.open(wav_io, "wb") as wav_file:
        voice.synthesize_wav(text, wav_file)
    return wav_io.getvalue()


@app.post("/synthesize")
def synthesize(req: SynthesizeRequest):
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty text")

    speaker_key = req.speaker.upper() if req.speaker else "HARMONY"
    if speaker_key not in VOICE_MODELS:
        speaker_key = "HARMONY"

    logger.info(f"Synthesizing for {speaker_key}: '{text[:50]}...'")

    try:
        # Step 1: Synthesize base speech using Piper
        base_wav_bytes = synthesize_piper_wav(text)

        # Step 2: RVC conversion into Ayaka (Harmony) or Furina (Echo) voice on RTX 4050
        try:
            from rvc_wrapper import convert_speech_wav, is_rvc_ready
            pitch_offset = req.pitch or 0
            final_wav_bytes = convert_speech_wav(base_wav_bytes, speaker=speaker_key, pitch_offset=pitch_offset)
        except Exception as rvc_err:
            logger.warning(f"RVC module error, using base audio: {rvc_err}")
            final_wav_bytes = base_wav_bytes

        # Convert to base64 data URL
        b64 = base64.b64encode(final_wav_bytes).decode("utf-8")
        data_url = f"data:audio/wav;base64,{b64}"

        return {
            "success": True,
            "speaker": speaker_key,
            "dataUrl": data_url,
            "lengthBytes": len(final_wav_bytes),
        }
    except Exception as e:
        logger.error(f"Synthesis error: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
        }


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=5055, log_level="info")
