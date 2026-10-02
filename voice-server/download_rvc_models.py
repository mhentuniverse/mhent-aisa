import os
import sys
import io
import shutil
from pathlib import Path
from huggingface_hub import hf_hub_download

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

MODELS_DIR = Path(__file__).resolve().parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

FILES = [
    {"repo_id": "lj1995/VoiceConversionWebUI", "filename": "hubert_base.pt", "min_size": 180 * 1024 * 1024},
    {"repo_id": "lj1995/VoiceConversionWebUI", "filename": "rmvpe.pt", "min_size": 30 * 1024 * 1024},
]

def main():
    print(f"Downloading RVC base weights via HuggingFace Hub to {MODELS_DIR}...")
    for item in FILES:
        fname = item["filename"]
        target = MODELS_DIR / fname
        if target.exists() and target.stat().st_size >= item["min_size"]:
            print(f"[OK] {fname} already downloaded ({target.stat().st_size / 1024 / 1024:.1f} MB)")
            continue

        print(f"[Downloading] {fname} from repo {item['repo_id']}...")
        try:
            downloaded_path = hf_hub_download(
                repo_id=item["repo_id"],
                filename=fname,
                local_dir=str(MODELS_DIR),
                local_dir_use_symlinks=False,
                resume_download=True
            )
            print(f"[Success] {fname} saved to {downloaded_path} ({os.path.getsize(downloaded_path) / 1024 / 1024:.1f} MB)")
        except Exception as e:
            print(f"[Error] Failed downloading {fname}: {e}")

    print("RVC base weights download process finished!")

if __name__ == "__main__":
    main()
