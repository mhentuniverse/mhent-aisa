import torch
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
MODEL_DIR = ROOT / "model voice"

print(f"Inspecting models in: {MODEL_DIR}")
for pth_name in ["ayaka-rmvpe.pth", "furina_rmvpe.pth"]:
    pth_file = MODEL_DIR / pth_name
    if not pth_file.exists():
        print(f"File not found: {pth_file}")
        continue
    cpt = torch.load(pth_file, map_location="cpu")
    sr = cpt.get("sr", "unknown")
    f0 = cpt.get("f0", "unknown")
    version = cpt.get("version", "unknown")
    keys = list(cpt.keys())
    print(f"--- {pth_name} ---")
    print(f"Sample Rate: {sr}")
    print(f"F0: {f0}")
    print(f"Version: {version}")
    print(f"Top-level keys: {keys}")
