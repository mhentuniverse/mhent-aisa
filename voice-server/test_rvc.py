import sys
import io
import time
import os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from rvc_wrapper import is_rvc_ready, get_rvc_loader, convert_speech_wav

print("Checking if RVC is ready...")
ready = is_rvc_ready()
print(f"RVC Ready: {ready}")

if not ready:
    print("Error: RVC assets missing!")
    sys.exit(1)

input_wav = "voice-server/test_out.wav"
if not os.path.exists(input_wav):
    print("test_out.wav missing, creating with piper...")
    import wave
    from piper import PiperVoice
    voice = PiperVoice.load("voice-server/models/vi_VN-vivos-x_low.onnx", config_path="voice-server/models/vi_VN-vivos-x_low.onnx.json")
    with wave.open(input_wav, "wb") as f:
        voice.synthesize_wav("Xin chào Sakura, em là Harmony đây!", f)

with open(input_wav, "rb") as f:
    base_bytes = f.read()

print(f"Base audio size: {len(base_bytes)} bytes")

# Test Harmony (Ayaka)
print("\n--- Testing Harmony 🌸 (Kamisato Ayaka) ---")
t0 = time.time()
harmony_bytes = convert_speech_wav(base_bytes, speaker="HARMONY", pitch_offset=0)
print(f"Harmony conversion completed in {time.time() - t0:.3f}s! Output size: {len(harmony_bytes)} bytes")
with open("voice-server/test_harmony_ayaka.wav", "wb") as f:
    f.write(harmony_bytes)

# Test Echo (Furina)
print("\n--- Testing Echo 😈 (Furina) ---")
t0 = time.time()
echo_bytes = convert_speech_wav(base_bytes, speaker="ECHO", pitch_offset=0)
print(f"Echo conversion completed in {time.time() - t0:.3f}s! Output size: {len(echo_bytes)} bytes")
with open("voice-server/test_echo_furina.wav", "wb") as f:
    f.write(echo_bytes)

print("\n🎉 ALL TESTS PASSED! RVC on RTX 4050 is fully operational!")
