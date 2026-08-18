# Backend/services/msg91.py
#
# MSG91 Server-Side Access Token Verification Service
# Communicates with MSG91's widget verification endpoint to validate client OTP access tokens.

import os
import httpx
import logging
import re
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

MSG91_VERIFY_ENDPOINT = os.getenv(
    "MSG91_VERIFY_URL",
    "https://control.msg91.com/api/v5/widget/verifyAccessToken"
)


def get_msg91_auth_key() -> str:
    return os.getenv("MSG91_AUTH_KEY", "").strip()


def normalize_phone_number(phone_raw: str) -> str:
    """
    Normalizes a phone number to standard format with country code prefix (e.g., '+919876543210').
    Handles numbers provided without '+' prefix.
    """
    if not phone_raw:
        return ""
    # Strip all non-digit and non-plus characters
    cleaned = re.sub(r"[^\d+]", "", str(phone_raw).strip())
    if not cleaned:
        return ""

    if cleaned.startswith("+"):
        return cleaned
    
    # If 10 digits (e.g. Indian mobile number without country code), prepend +91
    if len(cleaned) == 10:
        return f"+91{cleaned}"
    
    # If starting with country code digits (e.g. 919876543210), prepend +
    return f"+{cleaned}"


async def verify_msg91_access_token(access_token: str) -> Dict[str, Any]:
    """
    Verifies an MSG91 OTP Widget access token with MSG91's server endpoint.
    
    Returns a dict with:
      - valid: bool
      - phone: str (normalized)
      - error: str (human-readable error message if invalid)
      - raw_data: dict (parsed response if successful)
    """
    if not access_token or not access_token.strip():
        return {
            "valid": False,
            "phone": "",
            "error": "Access token is required.",
            "raw_data": {}
        }

    auth_key = get_msg91_auth_key()
    if not auth_key:
        logger.warning("MSG91_AUTH_KEY environment variable is not configured.")
        # Fail safe if credentials are not configured yet
        return {
            "valid": False,
            "phone": "",
            "error": "MSG91 authentication key is missing on backend server.",
            "raw_data": {}
        }

    payload = {
        "authkey": auth_key,
        "access-token": access_token.strip()
    }

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(MSG91_VERIFY_ENDPOINT, json=payload, headers=headers)
            
            if response.status_code != 200:
                logger.error(f"MSG91 verification endpoint returned non-200 status: {response.status_code}")
                return {
                    "valid": False,
                    "phone": "",
                    "error": f"Verification server returned status code {response.status_code}.",
                    "raw_data": {}
                }

            try:
                data = response.json()
            except Exception as json_err:
                logger.error(f"Failed to parse JSON response from MSG91: {json_err}")
                return {
                    "valid": False,
                    "phone": "",
                    "error": "Malformed response received from verification provider.",
                    "raw_data": {}
                }

            # Flexible parsing for MSG91 response variations
            # MSG91 typically returns {"type": "success", "message": "...", "mobile": "919876543210"}
            # or {"status": "success", "mobile_number": "..."}
            status_str = str(data.get("type") or data.get("status") or "").lower()
            is_success = status_str in ("success", "1", "true") or ("mobile" in data or "mobile_number" in data)

            if not is_success:
                msg = data.get("message") or data.get("detail") or "Invalid or expired access token."
                return {
                    "valid": False,
                    "phone": "",
                    "error": str(msg),
                    "raw_data": data
                }

            raw_phone = data.get("mobile") or data.get("mobile_number") or data.get("phone") or ""
            normalized_phone = normalize_phone_number(str(raw_phone))

            if not normalized_phone:
                return {
                    "valid": False,
                    "phone": "",
                    "error": "Verification succeeded but no phone identity was returned.",
                    "raw_data": data
                }

            return {
                "valid": True,
                "phone": normalized_phone,
                "error": "",
                "raw_data": data
            }

    except httpx.TimeoutException:
        logger.error("MSG91 verification request timed out.")
        return {
            "valid": False,
            "phone": "",
            "error": "Verification service timed out. Please try again.",
            "raw_data": {}
        }
    except Exception as e:
        logger.error(f"Error communicating with MSG91 verification service: {e}")
        return {
            "valid": False,
            "phone": "",
            "error": "Communication error with verification provider.",
            "raw_data": {}
        }
