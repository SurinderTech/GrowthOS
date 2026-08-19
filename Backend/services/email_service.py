# Backend/services/email_service.py
#
# Brevo (Sendinblue) REST API service for sending transactional emails (OTP, Password Reset, 2FA)

import os
import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


def get_brevo_api_key() -> str:
    return os.getenv("BREVO_API_KEY", "").strip()


def get_sender_email() -> str:
    return os.getenv("BREVO_SENDER_EMAIL", "noreply@growthos.com").strip()


def get_sender_name() -> str:
    return os.getenv("BREVO_SENDER_NAME", "GrowthOS").strip()


async def send_otp_email(to_email: str, otp_code: str, purpose: str = "Password Reset") -> bool:
    """
    Sends a styled HTML email containing the 6-digit OTP code using the Brevo API.
    """
    api_key = get_brevo_api_key()
    if not api_key:
        logger.error("BREVO_API_KEY environment variable is not configured.")
        print("ERROR: BREVO_API_KEY is not set.")
        return False

    sender_email = get_sender_email()
    sender_name = get_sender_name()

    subject = f"Your {purpose} Code: {otp_code} - GrowthOS"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #080e20; color: #ffffff; margin: 0; padding: 0; }}
            .container {{ max-width: 520px; margin: 30px auto; background: #0f172a; border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }}
            .header {{ background: linear-gradient(135deg, #4f46e5, #06b6d4); padding: 24px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px; color: #ffffff; }}
            .content {{ padding: 32px 24px; text-align: center; }}
            .title {{ font-size: 20px; font-weight: 700; color: #e2e8f0; margin-bottom: 12px; }}
            .desc {{ font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }}
            .otp-box {{ background: rgba(34, 211, 238, 0.1); border: 2px dashed #22d3ee; border-radius: 12px; padding: 18px 24px; display: inline-block; margin: 16px 0; }}
            .otp-code {{ font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #22d3ee; font-family: monospace; }}
            .expiry {{ font-size: 12px; color: #f59e0b; margin-top: 12px; font-weight: 600; }}
            .footer {{ background: #0b1120; padding: 18px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.05); }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>GrowthOS</h1>
            </div>
            <div class="content">
                <div class="title">{purpose} Request</div>
                <div class="desc">You requested a verification code for your GrowthOS account. Use the 6-digit OTP below to proceed:</div>
                <div class="otp-box">
                    <div class="otp-code">{otp_code}</div>
                </div>
                <div class="expiry">⏱️ This verification code is valid for 10 minutes.</div>
                <div style="margin-top: 24px; font-size: 12px; color: #64748b;">If you did not request this email, please ignore it or secure your account.</div>
            </div>
            <div class="footer">
                &copy; GrowthOS AI Career Acceleration Platform. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """

    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content,
    }

    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.post(BREVO_API_URL, json=payload, headers=headers)
            if response.status_code in (200, 201, 202):
                res_data = response.json() if response.text else {}
                msg_id = res_data.get("messageId", "")
                logger.info(f"OTP email sent successfully to {to_email} via Brevo. Message ID: {msg_id}")
                print(f"✅ SUCCESS: OTP email sent to {to_email} via Brevo! (Sender: {sender_email}, Message ID: {msg_id})")
                return True
            else:
                logger.error(f"Brevo API error ({response.status_code}): {response.text}")
                print(f"ERROR: Brevo API returned status {response.status_code}: {response.text}")
                print(f"\n=======================================================")
                print(f"🔑 [DEV OTP FALLBACK] Use this code for testing:")
                print(f"🔑 OTP Code for {to_email}: {otp_code}")
                print(f"=======================================================\n")
                return True
        except Exception as e:
            logger.error(f"Failed to send email via Brevo: {e}")
            print(f"EXCEPTION sending Brevo email: {e}")
            print(f"\n=======================================================")
            print(f"🔑 [DEV OTP FALLBACK] Use this code for testing:")
            print(f"🔑 OTP Code for {to_email}: {otp_code}")
            print(f"=======================================================\n")
            return True


async def send_verification_email(to_email: str, token: str, user_name: str = "User") -> bool:
    """
    Sends a styled HTML email containing the verification link using the Brevo API.
    Fallback prints the link in dev logs if Brevo key is missing or fails.
    """
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    verification_link = f"{frontend_url}/verify-email?token={token}"

    api_key = get_brevo_api_key()
    sender_email = get_sender_email()
    sender_name = get_sender_name()

    subject = "Verify Your GrowthOS Account 🚀"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #080e20; color: #ffffff; margin: 0; padding: 0; }}
            .container {{ max-width: 540px; margin: 30px auto; background: #0f172a; border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }}
            .header {{ background: linear-gradient(135deg, #4f46e5, #06b6d4); padding: 28px 24px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 1px; color: #ffffff; }}
            .content {{ padding: 32px 24px; text-align: center; }}
            .title {{ font-size: 22px; font-weight: 700; color: #e2e8f0; margin-bottom: 12px; }}
            .desc {{ font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 28px; }}
            .btn {{ display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%); color: #ffffff !important; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4); margin: 10px 0 24px; }}
            .link-text {{ font-size: 12px; color: #64748b; word-break: break-all; margin-top: 16px; }}
            .expiry {{ font-size: 12px; color: #f59e0b; margin-top: 16px; font-weight: 600; }}
            .footer {{ background: #0b1120; padding: 18px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.05); }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>GrowthOS</h1>
            </div>
            <div class="content">
                <div class="title">Welcome, {user_name}! 👋</div>
                <div class="desc">Please verify your email address to unlock full access to the GrowthOS AI Career Acceleration Platform.</div>
                <div>
                    <a href="{verification_link}" class="btn" target="_blank">Verify Email Address</a>
                </div>
                <div class="expiry">⏱️ This verification link expires in 24 hours.</div>
                <div class="link-text">If the button doesn't work, copy and paste this link into your browser:<br/><a href="{verification_link}" style="color: #38bdf8;">{verification_link}</a></div>
            </div>
            <div class="footer">
                &copy; GrowthOS AI Career Acceleration Platform. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """

    if not api_key:
        logger.warning("BREVO_API_KEY not configured. Printing dev verification link to console.")
        print(f"\n=======================================================")
        print(f"🔑 [DEV VERIFICATION LINK] Click or open in browser:")
        print(f"🔑 User: {to_email}")
        print(f"🔑 Link: {verification_link}")
        print(f"=======================================================\n")
        return True

    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content,
    }

    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.post(BREVO_API_URL, json=payload, headers=headers)
            if response.status_code in (200, 201, 202):
                logger.info(f"Verification email sent successfully to {to_email}")
                print(f"✅ SUCCESS: Verification email sent to {to_email} via Brevo!")
                print(f"🔑 Dev Verification Link: {verification_link}")
                return True
            else:
                logger.error(f"Brevo API error ({response.status_code}): {response.text}")
                print(f"ERROR: Brevo API returned status {response.status_code}: {response.text}")
                print(f"\n=======================================================")
                print(f"🔑 [DEV VERIFICATION LINK FALLBACK] Click or open in browser:")
                print(f"🔑 User: {to_email}")
                print(f"🔑 Link: {verification_link}")
                print(f"=======================================================\n")
                return True
        except Exception as e:
            logger.error(f"Failed to send email via Brevo: {e}")
            print(f"EXCEPTION sending verification email: {e}")
            print(f"\n=======================================================")
            print(f"🔑 [DEV VERIFICATION LINK FALLBACK] Click or open in browser:")
            print(f"🔑 User: {to_email}")
            print(f"🔑 Link: {verification_link}")
            print(f"=======================================================\n")
            return True



