import imageio_ffmpeg
import shutil
import os

exe = imageio_ffmpeg.get_ffmpeg_exe()
target = "voice-server/.venv/Scripts/ffmpeg.exe"
shutil.copy(exe, target)
print(f"FFmpeg ready at {target} ({os.path.getsize(target) / 1024 / 1024:.1f} MB)")
