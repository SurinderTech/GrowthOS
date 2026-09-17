# scratch/find_all_working_free_models.py
import sys
import os
import time
from pathlib import Path
import httpx

root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))
from dotenv import load_dotenv
load_dotenv(root_dir / "Backend" / ".env")

api_key = os.getenv("OPENROUTER_API_KEY", "")
headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

# 1. Fetch live models list from OpenRouter
res = httpx.get("https://openrouter.ai/api/v1/models")
data = res.json()

all_models = data.get("data", [])
candidate_free = []
for m in all_models:
    m_id = m.get("id", "")
    pricing = m.get("pricing", {})
    prompt_price = float(pricing.get("prompt", 1.0))
    completion_price = float(pricing.get("completion", 1.0))
    if (prompt_price == 0.0 and completion_price == 0.0) or m_id.endswith(":free"):
        candidate_free.append(m_id)

print(f"Discovered {len(candidate_free)} potential free models on OpenRouter.")
print("Testing each model with a live completion...\n")

working_free_models = []

for m in candidate_free:
    payload = {
        "model": m,
        "messages": [{"role": "user", "content": "Hi"}],
        "max_tokens": 10,
    }
    try:
        t0 = time.time()
        with httpx.Client(timeout=8.0) as client:
            resp = client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
            elapsed = round((time.time() - t0) * 1000, 1)
            if resp.status_code == 200:
                resp_json = resp.json()
                text = resp_json.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                used_model = resp_json.get("model", m)
                print(f"[WORKING 200] {m:<45} -> ({elapsed}ms) '{text}'")
                working_free_models.append(m)
            else:
                err_snippet = resp.text[:100].replace('\n', ' ')
                print(f"[FAIL {resp.status_code}]    {m:<45} -> {err_snippet}")
    except Exception as exc:
        print(f"[TIMEOUT/ERROR] {m:<45} -> {exc}")

print("\n==================================================")
print(f"VERIFIED WORKING FREE MODELS ({len(working_free_models)}):")
for wm in working_free_models:
    print(f" - '{wm}'")
print("==================================================")
