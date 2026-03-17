import os
from dotenv import load_dotenv
from pathlib import Path
from supabase import create_client
import google.generativeai as genai

# Explicitly load Backend/.env
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

print("SUPABASE_URL:", SUPABASE_URL)

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
gemini_model = genai.GenerativeModel("gemini-flash-latest")