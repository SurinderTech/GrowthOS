import asyncio
import os
import sys
import traceback
from pathlib import Path
from dotenv import load_dotenv
import httpx

root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))
load_dotenv(root_dir / "Backend" / ".env")

async def test():
    api_key = os.getenv("BREVO_API_KEY", "")
    sender_email = os.getenv("BREVO_SENDER_EMAIL", "")
    sender_name = os.getenv("BREVO_SENDER_NAME", "GrowthOS")
    
    print(f"API Key present: {bool(api_key)}, Length: {len(api_key)}")
    print(f"Sender Email: '{sender_email}'")
    print(f"Sender Name: '{sender_name}'")

    url = "https://api.brevo.com/v3/smtp/email"
    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": "surindrkumar0000@gmail.com"}],
        "subject": "GrowthOS Brevo Test",
        "htmlContent": "<p>This is a test email from GrowthOS.</p>",
    }
    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            print("Status Code:", response.status_code)
            print("Response Body:", response.text)
    except Exception as e:
        print("HTTP Exception:", e)
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
