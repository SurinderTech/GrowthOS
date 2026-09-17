# scratch/test_free_models_direct.py
import sys
import os
import time
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from dotenv import load_dotenv
load_dotenv(root_dir / "Backend" / ".env")

import httpx

api_key = os.getenv("OPENROUTER_API_KEY", "")
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
}

free_models_to_test = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen-2.5-coder-32b-instruct:free",
    "google/gemma-2-9b-it:free",
    "mistralai/mistral-small-24b-instruct-2501:free",
    "inclusionai/ling-3.0-flash-vl:free",
]

print("=== DIRECT HTTP TEST OF OPENROUTER FREE MODELS ===")
for model in free_models_to_test:
    t0 = time.time()
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": "Say hello in 3 words"}],
        "temperature": 0.3
    }
    try:
        with httpx.Client(timeout=10.0) as client:
            res = client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
            elapsed = round((time.time() - t0) * 1000, 1)
            if res.status_code == 200:
                data = res.json()
                content = data["choices"][0]["message"]["content"]
                used_model = data.get("model", model)
                print(f"[SUCCESS {res.status_code}] {model} -> '{content.strip()}' ({elapsed}ms) [Used: {used_model}]")
            else:
                print(f"[FAIL {res.status_code}] {model} -> {res.text[:150]}")
    except Exception as exc:
        print(f"[EXCEPTION] {model} -> {exc}")

print("=== TEST COMPLETE ===")
