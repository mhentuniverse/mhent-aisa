"""
AISA RVC Wrapper (Kamisato Ayaka for Harmony 🌸, Furina for Echo 😈)
Uses infer_rvc_python with CUDA acceleration on NVIDIA GeForce RTX 4050.
"""

import os
import io
import time
import tempfile
import logging
from pathlib import Path

# Ensure local ffmpeg is accessible
VENV_SCRIPTS = Path(__file__).resolve().parent / ".venv" / "Scripts"
if VENV_SCRIPTS.exists():
    os.environ["PATH"] = str(VENV_SCRIPTS) + os.pathsep + os.environ.get("PATH", "")

import soundfile as sf
import numpy as np

logger = logging.getLogger("aisa-rvc")

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent.parent
LOCAL_MODEL_VOICE_DIR = BASE_DIR.parent / "model voice"
PARENT_MODEL_VOICE_DIR = ROOT_DIR / "model voice"

if LOCAL_MODEL_VOICE_DIR.exists():
    MODEL_VOICE_DIR = LOCAL_MODEL_VOICE_DIR
elif PARENT_MODEL_VOICE_DIR.exists():
    MODEL_VOICE_DIR = PARENT_MODEL_VOICE_DIR
else:
    MODEL_VOICE_DIR = PARENT_MODEL_VOICE_DIR

MODELS_DIR = BASE_DIR / "models"

HUBERT_PATH = MODELS_DIR / "hubert_base.pt"
RMVPE_PATH = MODELS_DIR / "rmvpe.pt"

VOICE_CONFIGS = {
    "HARMONY": {
        "tag": "harmony",
        "name": "Kamisato Ayaka",
        "model_file": MODEL_VOICE_DIR / "ayaka-rmvpe.pth",
        "index_file": MODEL_VOICE_DIR / "added_IVF1228_Flat_nprobe_1_kamisato_ayaka_v2.index",
        "pitch_shift": 0,
        "index_rate": 0.75,
    },
    "ECHO": {
        "tag": "echo",
        "name": "Furina",
        "model_file": MODEL_VOICE_DIR / "furina_rmvpe.pth",
        "index_file": MODEL_VOICE_DIR / "added_IVF1203_Flat_nprobe_1_furina_rmvpe_v2.index",
        "pitch_shift": 0,
        "index_rate": 0.75,
    },
}

_loader = None
_configured_tags = set()

def is_rvc_ready() -> bool:
    """Check if all required model weights and base assets exist."""
    harmony_pth = VOICE_CONFIGS["HARMONY"]["model_file"].exists()
    echo_pth = VOICE_CONFIGS["ECHO"]["model_file"].exists()
    rmvpe_ready = RMVPE_PATH.exists() and RMVPE_PATH.stat().st_size > 30 * 1024 * 1024
    return harmony_pth and echo_pth and rmvpe_ready


def get_rvc_loader():
    """Lazy initialize and configure BaseLoader with CUDA."""
    global _loader, _configured_tags
    if _loader is not None:
        return _loader

    if not is_rvc_ready():
        logger.warning("RVC assets not fully downloaded or missing.")
        return None

    try:
        from infer_rvc_python.main import BaseLoader

        logger.info("Initializing RVC BaseLoader on CUDA (RTX 4050)...")
        _loader = BaseLoader(
            only_cpu=False,
            hubert_path=None,
            rmvpe_path=str(RMVPE_PATH),
            preload_models=False
        )

        for speaker_key, cfg in VOICE_CONFIGS.items():
            tag = cfg["tag"]
            if tag not in _configured_tags:
                logger.info(f"Configuring RVC model for {speaker_key} ({cfg['name']})...")
                _loader.apply_conf(
                    tag=tag,
                    file_model=str(cfg["model_file"]),
                    file_index=str(cfg["index_file"]) if cfg["index_file"].exists() else "",
                    pitch_algo="rmvpe",
                    pitch_lvl=cfg["pitch_shift"],
                    index_influence=cfg["index_rate"]
                )
                _configured_tags.add(tag)

        logger.info("RVC BaseLoader initialized successfully!")
        return _loader
    except Exception as e:
        logger.error(f"Failed to initialize RVC loader: {e}", exc_info=True)
        return None


def convert_speech_wav(wav_bytes: bytes, speaker: str = "HARMONY", pitch_offset: int = 0) -> bytes:
    """
    Takes raw WAV bytes (from Piper or base speech), converts it to Ayaka/Furina voice.
    Returns converted WAV bytes.
    """
    speaker_key = (speaker or "HARMONY").upper()
    if speaker_key not in VOICE_CONFIGS:
        speaker_key = "HARMONY"

    cfg = VOICE_CONFIGS[speaker_key]
    tag = cfg["tag"]

    loader = get_rvc_loader()
    if loader is None:
        logger.warning("RVC Loader not ready. Returning original base audio.")
        return wav_bytes

    t0 = time.time()

    # Write input to temp wav
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as in_f:
        in_path = in_f.name
        in_f.write(wav_bytes)

    out_path = in_path.replace(".wav", "_rvc.wav")

    try:
        pitch = cfg["pitch_shift"] + (pitch_offset or 0)

        # Run conversion
        res = loader(
            audio_files=[in_path],
            tag_list=[tag],
            overwrite=False,
            type_output="wav",
            show_progress=False
        )

        if isinstance(res, (list, tuple)) and len(res) > 0 and os.path.exists(res[0]):
            target_out = res[0]
        elif isinstance(res, str) and os.path.exists(res):
            target_out = res
        elif os.path.exists(out_path):
            target_out = out_path
        else:
            target_out = in_path

        with open(target_out, "rb") as out_f:
            converted_bytes = out_f.read()

        logger.info(f"RVC conversion for {speaker_key} done in {time.time() - t0:.3f}s ({len(converted_bytes)} bytes)")
        return converted_bytes

    except Exception as e:
        logger.error(f"RVC conversion error: {e}", exc_info=True)
        return wav_bytes
    finally:
        # Cleanup temp files
        for p in [in_path, out_path]:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass
