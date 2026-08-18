import os
import sys

# Ensure root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()
load_dotenv('Backend/.env')

from Backend.ai.openrouter_client import get_openrouter_client, fetch_live_free_models

print("--- 1. Fetching Live Free Models from OpenRouter ---")
free_models = fetch_live_free_models()
print(f"Discovered {len(free_models)} free models:")
for m in free_models[:8]:
    print(f" - {m}")

print("\n--- 2. Testing Chat Completion with Auto Fallback ---")
client = get_openrouter_client()
res = client.chat(
    messages=[{"role": "user", "content": "Say hello in one short sentence."}],
    model="deepseek/deepseek-r1-0528:free"  # Intentional paid/deprecated model to test auto-fallback
)
print("SUCCESS!")
print(f"Model used: {res.model}")
print(f"Response: {res.text}")
