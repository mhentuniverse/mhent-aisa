import inspect
from piper import PiperVoice

print("PiperVoice methods:")
for name, func in inspect.getmembers(PiperVoice, predicate=inspect.isfunction):
    print(f"- {name}: {inspect.signature(func)}")
