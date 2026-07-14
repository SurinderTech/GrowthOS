import os
from dotenv import load_dotenv
from pathlib import Path
from supabase import create_client
from Backend.services.mesh_client import create_mesh_model

# Explicitly load Backend/.env
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

print("SUPABASE_URL:", SUPABASE_URL)

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

mesh_model = create_mesh_model()
gemini_model = mesh_model