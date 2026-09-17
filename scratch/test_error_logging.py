# scratch/test_error_logging.py
import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.testclient import TestClient

root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from Backend.middleware.logger_middleware import RequestLoggingMiddleware, setup_exception_handlers

test_app = FastAPI()
setup_exception_handlers(test_app)
test_app.add_middleware(RequestLoggingMiddleware)

@test_app.get("/success")
def success_route():
    return {"status": "ok"}

@test_app.get("/fail-500")
def fail_route():
    # Intentionally trigger an exception
    raise ValueError("Database connection failed or API key missing!")

client = TestClient(test_app, raise_server_exceptions=False)

print("\n--- TEST 1: SUCCESS (200) ---")
res1 = client.get("/success")
print("Response:", res1.status_code, res1.json())

print("\n--- TEST 2: ERROR (500) ---")
res2 = client.get("/fail-500")
print("Response:", res2.status_code, res2.json())
