import os
from dotenv import load_dotenv
from pathlib import Path
from supabase import create_client

# Explicitly load Backend/.env
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

print("SUPABASE_URL:", SUPABASE_URL)

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# AI model access now goes through Backend/ai/ (OpenRouterClient + ModelRouter +
# Orchestrator), not through a module-level model instance here. See
# Backend/ai/orchestrator.py::get_orchestrator() and
# Backend/services/gemini_service.py for the legacy-compat path.