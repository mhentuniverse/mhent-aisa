import wave
import os
import sys
import io
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
from piper import PiperVoice

model_path = "voice-server/models/vi_VN-vivos-x_low.onnx"
config_path = "voice-server/models/vi_VN-vivos-x_low.onnx.json"
output_path = "voice-server/test_out.wav"

print(f"Loading Piper voice from {model_path}...")
t0 = time.time()
voice = PiperVoice.load(model_path, config_path=config_path)
print(f"Loaded voice in {time.time() - t0:.3f}s")

text = "Xin chào Sakura, em là Harmony đây! Em rất vui được đồng hành cùng cậu."
print(f"Synthesizing: '{text}'...")
t1 = time.time()
with wave.open(output_path, "wb") as wav_file:
    voice.synthesize_wav(text, wav_file)
t2 = time.time()

size = os.path.getsize(output_path)
print(f"Done in {t2 - t1:.3f}s! Generated file: {output_path} ({size} bytes, {size / 1024:.1f} KB)")
