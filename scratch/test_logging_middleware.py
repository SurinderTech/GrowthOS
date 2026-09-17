# scratch/test_logging_middleware.py
import sys
from pathlib import Path
from fastapi.testclient import TestClient

root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from Backend.main import app

client = TestClient(app)

print("=== TESTING LOGGING MIDDLEWARE & EXCEPTION HANDLERS ===\n")

print("--- 1. Testing GET / (200 OK) ---")
res1 = client.get("/")
print("Response:", res1.json())

print("\n--- 2. Testing POST /auth/login (401 Bad Credentials) ---")
res2 = client.post("/auth/login", data={"username": "invalid@test.com", "password": "wrongpassword"})
print("Response:", res2.status_code, res2.json())

print("\n--- 3. Testing Non-existent Route (404 Not Found) ---")
res3 = client.get("/non-existent-route")
print("Response:", res3.status_code)

print("\n=== LOGGING TEST COMPLETE ===")
