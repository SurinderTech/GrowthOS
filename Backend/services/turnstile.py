# Backend/services/turnstile.py
# Cloudflare Turnstile CAPTCHA verification service

import os
import httpx
import logging

logger = logging.getLogger(__name__)

TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

async def verify_turnstile_token(token: str | None, client_ip: str | None = None) -> bool:
    """
    Verifies a Cloudflare Turnstile token with Cloudflare's siteverify API.
    Returns True if valid or if Turnstile verification is bypassed in dev mode.
    """
    secret_key = os.getenv("TURNSTILE_SECRET_KEY", "").strip()

    # Dev / local test fallback if no secret key is provided or dummy test key is used
    if not secret_key or secret_key.startswith("1x00000000"):
        logger.info("Cloudflare Turnstile secret key not configured or using test key. Bypassing verification in dev.")
        print(f"ℹ️ [TURNSTILE DEV MODE] Bypassing CAPTCHA verification (token provided: {bool(token)})")
        return True

    if not token or not token.strip():
        logger.warning("Turnstile token missing.")
        return False

    payload = {
        "secret": secret_key,
        "response": token.strip(),
    }
    if client_ip:
        payload["remoteip"] = client_ip

    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            res = await client.post(TURNSTILE_VERIFY_URL, data=payload)
            if res.status_code == 200:
                result = res.json()
                success = result.get("success", False)
                if not success:
                    logger.warning(f"Turnstile verification failed. Error codes: {result.get('error-codes')}")
                return success
            else:
                logger.error(f"Turnstile API returned HTTP status {res.status_code}: {res.text}")
                return False
        except Exception as e:
            logger.error(f"Failed to communicate with Cloudflare Turnstile API: {e}")
            return False
