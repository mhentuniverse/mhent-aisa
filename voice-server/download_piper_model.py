"""
Download Piper Vietnamese voice model (vi_VN-vivos-x_low)
Model size: ~25MB
"""

import urllib.request
import os
from pathlib import Path

MODELS_DIR = Path(__file__).resolve().parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

BASE_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/vi/vi_VN/vivos/x_low"
FILES = [
    "vi_VN-vivos-x_low.onnx",
    "vi_VN-vivos-x_low.onnx.json"
]

def download():
    print(f"Downloading Vietnamese voice model to: {MODELS_DIR}")
    for fname in FILES:
        target = MODELS_DIR / fname
        if target.exists() and target.stat().st_size > 1000:
            print(f"Already exists: {fname} ({target.stat().st_size / 1024 / 1024:.2f} MB)")
            continue
        url = f"{BASE_URL}/{fname}"
        print(f"Downloading {fname} from {url}...")
        try:
            urllib.request.urlretrieve(url, str(target))
            print(f"Downloaded: {fname} ({target.stat().st_size / 1024 / 1024:.2f} MB)")
        except Exception as e:
            print(f"Failed to download {fname}: {e}")

if __name__ == "__main__":
    download()
