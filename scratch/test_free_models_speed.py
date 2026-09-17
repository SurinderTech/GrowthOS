# scratch/test_free_models_speed.py
import sys
import time
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from dotenv import load_dotenv
load_dotenv(root_dir / "Backend" / ".env")

from Backend.ai.openrouter_client import get_openrouter_client

client = get_openrouter_client()

test_models = [
    "inclusionai/ling-3.0-flash-vl:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen-2.5-coder-32b-instruct:free",
    "google/gemma-2-9b-it:free",
    "mistralai/mistral-small-24b-instruct-2501:free",
    "z-ai/glm-5.2:free",
    "nvidia/nemotron-3.5-lightning:free",
]

print("=== TESTING EXPLICIT FREE MODELS PERFORMANCE ===")
for m in test_models:
    try:
        t0 = time.time()
        res = client.chat(
            model=m,
            messages=[{"role": "user", "content": "Respond with 1 word: 'Operational'"}],
            temperature=0.1
        )
        elapsed = round((time.time() - t0) * 1000, 1)
        print(f"[OK] [{m}] -> '{res.text}' ({elapsed}ms) [Model: {res.model}]")
    except Exception as e:
        print(f"[FAIL] [{m}] -> Failed: {e}")

print("=== DONE ===")
