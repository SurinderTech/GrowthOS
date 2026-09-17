import asyncio
import os
import sys
from pathlib import Path

# Add root directory to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from dotenv import load_dotenv
load_dotenv(root_dir / "Backend" / ".env")

from Backend.services.email_service import send_verification_email

async def main():
    email = "surindrkumar0000@gmail.com"
    token = "test_verification_token_123"
    print(f"Testing send_verification_email with BREVO_SENDER_EMAIL={os.getenv('BREVO_SENDER_EMAIL')}...")
    success = await send_verification_email(email, token, user_name="Surinder Test")
    print("Result:", success)

if __name__ == "__main__":
    asyncio.run(main())
