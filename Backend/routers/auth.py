# backend/routes.py
# All authentication API routes:
#   POST /auth/register      — create new account
#   POST /auth/login         — sign in, get token
#   GET  /auth/me            — get logged-in user info
#   GET  /auth/google        — start Google OAuth flow
#   GET  /auth/google/callback
#   GET  /auth/facebook      — start Facebook OAuth flow
#   GET  /auth/facebook/callback
#   GET  /auth/linkedin      — start LinkedIn OAuth flow
#   GET  /auth/linkedin/callback

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
import os
import httpx
from dotenv import load_dotenv
from datetime import datetime, timedelta
from Backend.schemas.auth import (
    RegisterRequest, AuthResponse, RequestOTPRequest, VerifyOTPRequest,
    ResetPasswordWithOTPRequest, OTPResponse, PhoneVerifyRequest, PhoneVerifyResponse,
    VerifyEmailRequest, ResendVerificationRequest
)
from Backend.schemas.user import UserResponse

from Backend.db.session import get_db
from Backend.models.onboarding import UserOnboarding
from Backend.models.user import User
from Backend.models.otp import UserOTP
from Backend.models.user_verification import UserVerificationToken
from Backend.services.email_service import send_otp_email, send_verification_email
from Backend.services.rate_limiter import rate_limiter
from Backend.services.turnstile import verify_turnstile_token
from Backend.services.msg91 import verify_msg91_access_token
from Backend.auth import hash_password, verify_password, create_access_token, get_current_user, get_current_user_allow_unverified


load_dotenv()


router = APIRouter(prefix="/auth", tags=["Authentication"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# ── Set up OAuth providers (authlib)
oauth = OAuth()

oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
    claims_options={
        "iat": {"leeway": 300},
        "exp": {"leeway": 300},
        "nbf": {"leeway": 300},
    },
)

oauth.register(
    name="facebook",
    client_id=os.getenv("FACEBOOK_CLIENT_ID"),
    client_secret=os.getenv("FACEBOOK_CLIENT_SECRET"),
    access_token_url="https://graph.facebook.com/oauth/access_token",
    authorize_url="https://www.facebook.com/dialog/oauth",
    api_base_url="https://graph.facebook.com/",
    client_kwargs={"scope": "email public_profile"},
)

oauth.register(
    name="linkedin",
    client_id=os.getenv("LINKEDIN_CLIENT_ID"),
    client_secret=os.getenv("LINKEDIN_CLIENT_SECRET"),
    access_token_url="https://www.linkedin.com/oauth/v2/accessToken",
    authorize_url="https://www.linkedin.com/oauth/v2/authorization",
    api_base_url="https://api.linkedin.com/v2/",
    client_kwargs={
        "scope": "openid profile email",
        "token_endpoint_auth_method": "client_secret_post",
    },
)

# ─────────────────────────────────────────────
# POST /auth/register
# Creates a new user with hashed password (unverified by default)
# ─────────────────────────────────────────────
@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(data: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if (request.client and request.client.host) else "127.0.0.1"

    # 1. Rate Limiting (max 5 signup requests per hour per IP)
    rate_limiter.check_rate_limit(f"signup:{client_ip}", max_requests=5, window_seconds=3600)

    # 2. Cloudflare Turnstile CAPTCHA verification
    is_captcha_valid = await verify_turnstile_token(data.turnstile_token, client_ip)
    if not is_captcha_valid:
        raise HTTPException(
            status_code=400,
            detail="Cloudflare Turnstile verification failed. Please complete bot verification."
        )

    # Trim whitespace and lowercase email
    email = data.email.strip().lower()
    password = data.password.strip()

    # Check if email already used
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # Create unverified user
    user = User(
        email=email,
        name=f"{data.first_name.strip()} {data.last_name.strip()}",
        hashed_password=hash_password(password),
        provider="credentials",
        email_verified=False,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    print(f"User registered (unverified): {user.email} (ID: {user.id})")

    # Create secure verification token valid for 24 hours
    verification_token = UserVerificationToken.generate_token()
    ver_token_record = UserVerificationToken(
        user_id=user.id,
        token=verification_token,
        expires_at=datetime.utcnow() + timedelta(hours=24)
    )
    db.add(ver_token_record)
    db.commit()

    # Send verification email asynchronously
    await send_verification_email(user.email, verification_token, user.name or "User")

    token = create_access_token(str(user.id), user.email)

    try:
        user_resp = UserResponse.model_validate(user)
        return AuthResponse(access_token=token, user=user_resp)
    except Exception as e:
        print(f"DEBUG: Registration validation failed for {user.email}: {e}")
        user_data = {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "image": user.image,
            "email_verified": user.email_verified,
            "onboarding_completed": user.onboarding_completed
        }
        return AuthResponse(access_token=token, user=UserResponse(**user_data))


# ─────────────────────────────────────────────
# POST /auth/verify-email
# Verifies a secure verification token and marks email_verified = True
# ─────────────────────────────────────────────
@router.post("/verify-email", response_model=AuthResponse)
async def verify_email(data: VerifyEmailRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if (request.client and request.client.host) else "127.0.0.1"

    # Rate limiting (max 10 verification attempts per minute per IP)
    rate_limiter.check_rate_limit(f"verify_email:{client_ip}", max_requests=10, window_seconds=60)

    token_str = data.token.strip()
    if not token_str:
        raise HTTPException(status_code=400, detail="Verification token is required.")

    ver_token = db.query(UserVerificationToken).filter(
        UserVerificationToken.token == token_str,
        UserVerificationToken.is_used == False
    ).order_by(UserVerificationToken.created_at.desc()).first()

    if not ver_token or not ver_token.is_valid():
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired verification link. Please request a new verification email."
        )

    user = db.query(User).filter(User.id == ver_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    user.email_verified = True
    user.email_verified_at = datetime.utcnow()
    ver_token.is_used = True
    db.commit()
    db.refresh(user)

    print(f"Email verified successfully for user: {user.email}")
    access_token = create_access_token(str(user.id), user.email)
    user_resp = UserResponse.model_validate(user)
    return AuthResponse(access_token=access_token, user=user_resp)


# ─────────────────────────────────────────────
# POST /auth/resend-verification
# Resends verification email to unverified user
# ─────────────────────────────────────────────
@router.post("/resend-verification", response_model=OTPResponse)
async def resend_verification_email(
    data: ResendVerificationRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    client_ip = request.client.host if (request.client and request.client.host) else "127.0.0.1"

    # Rate limiting (max 3 resend attempts per 15 minutes per IP)
    rate_limiter.check_rate_limit(f"resend_verification:{client_ip}", max_requests=3, window_seconds=900)

    user = None

    # Option A: Get user from Bearer Token if present
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            from Backend.auth import decode_token
            payload = decode_token(token)
            user_id = payload.get("sub")
            if user_id:
                user = db.query(User).filter(User.id == user_id).first()
        except Exception:
            pass

    # Option B: Get user by provided email
    if not user and data.email:
        email_clean = data.email.strip().lower()
        user = db.query(User).filter(User.email == email_clean).first()

    if not user:
        return OTPResponse(
            message="If an unverified account exists for this email, a verification link has been sent.",
            success=True
        )

    if user.email_verified:
        return OTPResponse(message="Your email address is already verified.", success=True)

    # Invalidate previous unused verification tokens for this user
    db.query(UserVerificationToken).filter(
        UserVerificationToken.user_id == user.id,
        UserVerificationToken.is_used == False
    ).update({"is_used": True})

    new_token = UserVerificationToken.generate_token()
    ver_token = UserVerificationToken(
        user_id=user.id,
        token=new_token,
        expires_at=datetime.utcnow() + timedelta(hours=24)
    )
    db.add(ver_token)
    db.commit()

    await send_verification_email(user.email, new_token, user.name or "User")

    return OTPResponse(
        message=f"Verification email sent to {user.email}. Please check your inbox.",
        success=True
    )

# ─────────────────────────────────────────────
# POST /auth/login
# Verifies email + password, returns JWT token
# ─────────────────────────────────────────────
@router.post("/login", response_model=AuthResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. Try with trimmed/lowercase as per current standard
    username = form_data.username.strip().lower()
    password = form_data.password.strip()
    
    print(f"DEBUG: Login attempt for: {username}")
    user = db.query(User).filter(User.email == username).first()

    if not user:
        # 2. Try with original username just in case
        user = db.query(User).filter(User.email == form_data.username.lower()).first()
        if not user:
            print(f"DEBUG: User NOT found: {username}")
            raise HTTPException(status_code=401, detail="No account found with this email")

    if not user.hashed_password:
        raise HTTPException(status_code=401, detail="This account uses social login.")

    # 3. Verify password (try stripped first, then original)
    is_valid = verify_password(password, user.hashed_password)
    if not is_valid:
        print("DEBUG: Stripped password failed, trying original...")
        is_valid = verify_password(form_data.password, user.hashed_password)

    if not is_valid:
        print(f"DEBUG: Password verification failed for: {username}")
        raise HTTPException(status_code=401, detail="Incorrect password")

    print(f"DEBUG: Login successful: {username}")
    token = create_access_token(str(user.id), user.email)

    try:
        user_resp = UserResponse.model_validate(user)
        return AuthResponse(access_token=token, user=user_resp)
    except Exception as e:
        print(f"DEBUG: Validation error: {e}")
        return AuthResponse(access_token=token, user=UserResponse.from_orm(user))

# ─────────────────────────────────────────────
# EMERGENCY PASSWORD RESET (Dev Use Only)
# ─────────────────────────────────────────────
@router.post("/dev-reset-password")
async def dev_reset_password(email: str, new_password: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email.lower().strip()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    from Backend.auth import hash_password
    user.hashed_password = hash_password(new_password.strip())
    db.commit()
    return {"message": f"Password successfully updated for {email}. You can now log in with the new password."}


# ─────────────────────────────────────────────
# GET /auth/me
# Returns current logged-in user's info
# ─────────────────────────────────────────────
@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user_allow_unverified)):
    try:
        return UserResponse.model_validate(current_user)
    except Exception:
        return UserResponse(
            id=current_user.id,
            email=current_user.email,
            name=current_user.name,
            image=current_user.image,
            email_verified=getattr(current_user, "email_verified", False),
            onboarding_completed=current_user.onboarding_completed
        )


# ─────────────────────────────────────────────
# GOOGLE OAUTH
# ─────────────────────────────────────────────
@router.get("/google")
async def google_login(request: Request):
    redirect_uri = f"{request.base_url}auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    info = None
    try:
        token = await oauth.google.authorize_access_token(
            request,
            claims_options={
                "iat": {"leeway": 300},
                "exp": {"leeway": 300},
                "nbf": {"leeway": 300},
            }
        )
        info = token.get("userinfo")
        if not info and "access_token" in token:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {token['access_token']}"}
                )
                if res.status_code == 200:
                    info = res.json()
    except Exception:
        # Fallback to fetching access token directly if id_token claims validation fails due to machine clock skew
        try:
            token = await oauth.google.fetch_access_token(request)
            if token and "access_token" in token:
                async with httpx.AsyncClient() as client:
                    res = await client.get(
                        "https://www.googleapis.com/oauth2/v3/userinfo",
                        headers={"Authorization": f"Bearer {token['access_token']}"}
                    )
                    if res.status_code == 200:
                        info = res.json()
        except Exception as err:
            return RedirectResponse(f"{FRONTEND_URL}/login?error=Google+authentication+failed.+Please+try+again.")

    if not info or not info.get("email"):
        return RedirectResponse(f"{FRONTEND_URL}/login?error=Google+did+not+return+a+valid+email.")

    email_clean = info["email"].lower()
    name = info.get("name") or info.get("given_name") or email_clean.split("@")[0]
    picture = info.get("picture")
    sub = info.get("sub")

    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        user = User(
            email=email_clean,
            name=name,
            image=picture,
            provider="google",
            provider_id=sub,
            email_verified=True,
            email_verified_at=datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Seamless account linking for existing email accounts
        if picture and not user.image:
            user.image = picture
        if sub and not getattr(user, "provider_id", None):
            user.provider_id = sub
        if not user.email_verified:
            user.email_verified = True
            user.email_verified_at = datetime.utcnow()
        db.commit()

    access_token = create_access_token(str(user.id), user.email)
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={access_token}")


# ─────────────────────────────────────────────
# FACEBOOK OAUTH
# ─────────────────────────────────────────────
@router.get("/facebook")
async def facebook_login(request: Request):
    redirect_uri = f"{str(request.base_url).rstrip('/')}/auth/facebook/callback"
    return await oauth.facebook.authorize_redirect(request, redirect_uri)


@router.get("/facebook/callback")
async def facebook_callback(request: Request, db: Session = Depends(get_db)):
    try:
        token = await oauth.facebook.authorize_access_token(request)
        resp  = await oauth.facebook.get("me?fields=id,name,email,picture.type(large)", token=token)
        info  = resp.json()
    except Exception as err:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=Facebook+authentication+failed.+Please+try+again.")

    email = info.get("email")
    if not email:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=Facebook+did+not+return+a+valid+email+address.")

    email_clean = email.lower()
    name = info.get("name") or email_clean.split("@")[0]
    picture = info.get("picture", {}).get("data", {}).get("url")
    sub = str(info.get("id"))

    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        user = User(
            email=email_clean,
            name=name,
            image=picture,
            provider="facebook",
            provider_id=sub,
            email_verified=True,
            email_verified_at=datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if picture and not user.image:
            user.image = picture
        if sub and not getattr(user, "provider_id", None):
            user.provider_id = sub
        if not user.email_verified:
            user.email_verified = True
            user.email_verified_at = datetime.utcnow()
        db.commit()

    access_token = create_access_token(str(user.id), user.email)
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={access_token}")


# ─────────────────────────────────────────────
# LINKEDIN OAUTH
# ─────────────────────────────────────────────
@router.get("/linkedin")
async def linkedin_login(request: Request):
    redirect_uri = f"{str(request.base_url).rstrip('/')}/auth/linkedin/callback"
    return await oauth.linkedin.authorize_redirect(request, redirect_uri)


@router.get("/linkedin/callback")
async def linkedin_callback(request: Request, db: Session = Depends(get_db)):
    info = None
    try:
        token = await oauth.linkedin.authorize_access_token(request)
        # Try fetching userinfo from LinkedIn OpenID Connect endpoint
        resp = await oauth.linkedin.get("https://api.linkedin.com/v2/userinfo", token=token)
        if resp.status_code == 200:
            info = resp.json()
        elif "access_token" in token:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    "https://api.linkedin.com/v2/userinfo",
                    headers={"Authorization": f"Bearer {token['access_token']}"}
                )
                if res.status_code == 200:
                    info = res.json()
    except Exception as err:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=LinkedIn+authentication+failed.+Please+try+again.")

    if not info or not info.get("email"):
        return RedirectResponse(f"{FRONTEND_URL}/login?error=LinkedIn+did+not+return+a+valid+email+address.")

    email_clean = info["email"].lower()
    name = info.get("name") or (info.get("given_name", "") + " " + info.get("family_name", "")).strip() or email_clean.split("@")[0]
    picture = info.get("picture")
    sub = str(info.get("sub") or info.get("id"))

    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        user = User(
            email=email_clean,
            name=name,
            image=picture,
            provider="linkedin",
            provider_id=sub,
            email_verified=True,
            email_verified_at=datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if picture and not user.image:
            user.image = picture
        if sub and not getattr(user, "provider_id", None):
            user.provider_id = sub
        if not user.email_verified:
            user.email_verified = True
            user.email_verified_at = datetime.utcnow()
        db.commit()

    access_token = create_access_token(str(user.id), user.email)
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={access_token}")
from pydantic import BaseModel
from typing import Optional

class ProfileUpdateRequest(BaseModel):
    name:       Optional[str] = None
    bio:        Optional[str] = None
    country:    Optional[str] = None
    phone:      Optional[str] = None
    image:      Optional[str] = None
    avatar_url: Optional[str] = None


@router.get("/me")
def get_current_user_profile(
    current_user: User = Depends(get_current_user_allow_unverified),
    db: Session = Depends(get_db)
):
    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
    clean_name = current_user.name or (ob.full_name if ob else None) or current_user.email.split("@")[0]
    avatar_url = current_user.image or f"https://api.dicebear.com/7.x/avataaars/svg?seed={clean_name.replace(' ', '')}&backgroundColor=030712"
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "name": clean_name,
        "full_name": clean_name,
        "image": avatar_url,
        "avatar_url": avatar_url,
        "email_verified": getattr(current_user, "email_verified", False),
        "plan_tier": ob.user_type.title() if (ob and ob.user_type) else "Free Plan",
        "onboarding_completed": ob.onboarding_completed if ob else False,
    }


@router.patch("/profile")
def update_profile(
    req: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if req.name is not None and req.name.strip():
        current_user.name = req.name.strip()

    if req.image is not None and req.image.strip():
        current_user.image = req.image.strip()
    elif req.avatar_url is not None and req.avatar_url.strip():
        current_user.image = req.avatar_url.strip()

    current_user.updated_at = datetime.utcnow()

    # Update country & name in onboarding if it exists
    ob = db.query(UserOnboarding).filter(
        UserOnboarding.user_id == current_user.id
    ).first()
    if ob:
        if req.name is not None and req.name.strip():
            ob.full_name = req.name.strip()
        if req.country is not None and req.country.strip():
            ob.country = req.country.strip()

    db.commit()
    db.refresh(current_user)

    avatar_url = current_user.image or f"https://api.dicebear.com/7.x/avataaars/svg?seed={(current_user.name or 'User').replace(' ', '')}&backgroundColor=030712"

    return {
        "success": True,
        "user": {
            "name":       current_user.name,
            "email":      current_user.email,
            "image":      avatar_url,
            "avatar_url": avatar_url,
        }
    }


# ─────────────────────────────────────────────
# FORGOT PASSWORD & 2FA OTP ENDPOINTS
# ─────────────────────────────────────────────

@router.post("/forgot-password/request-otp", response_model=OTPResponse)
async def request_forgot_password_otp(data: RequestOTPRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Fail gracefully without revealing user existence
        return OTPResponse(message="If an account with this email exists, a 6-digit OTP code has been sent.", success=True)

    # Invalidate previous unused OTPs for this email and purpose
    db.query(UserOTP).filter(
        UserOTP.email == email,
        UserOTP.purpose == data.purpose,
        UserOTP.is_used == False
    ).update({"is_used": True})

    otp_code = UserOTP.generate_otp_code()
    otp_record = UserOTP(
        email=email,
        user_id=user.id,
        otp_code=otp_code,
        purpose=data.purpose,
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db.add(otp_record)
    db.commit()

    sent = await send_otp_email(email, otp_code, purpose="Password Reset")
    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send OTP email via Brevo. Please try again later.")

    return OTPResponse(message="A 6-digit verification code has been sent to your email.", success=True)


@router.post("/forgot-password/verify-otp", response_model=OTPResponse)
async def verify_forgot_password_otp(data: VerifyOTPRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    otp_code = data.otp_code.strip()

    otp_record = db.query(UserOTP).filter(
        UserOTP.email == email,
        UserOTP.otp_code == otp_code,
        UserOTP.purpose == data.purpose,
        UserOTP.is_used == False
    ).order_by(UserOTP.created_at.desc()).first()

    if not otp_record or not otp_record.is_valid():
        raise HTTPException(status_code=400, detail="Invalid or expired OTP verification code.")

    return OTPResponse(message="OTP verification code is valid.", success=True)


@router.post("/forgot-password/reset-password", response_model=OTPResponse)
async def reset_password_with_otp(data: ResetPasswordWithOTPRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    otp_code = data.otp_code.strip()
    new_password = data.new_password.strip()

    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters long.")

    otp_record = db.query(UserOTP).filter(
        UserOTP.email == email,
        UserOTP.otp_code == otp_code,
        UserOTP.purpose == "password_reset",
        UserOTP.is_used == False
    ).order_by(UserOTP.created_at.desc()).first()

    if not otp_record or not otp_record.is_valid():
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code. Please request a new code.")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    user.hashed_password = hash_password(new_password)
    otp_record.is_used = True
    db.commit()

    return OTPResponse(message="Password reset successfully! You can now log in with your new password.", success=True)


@router.post("/2fa/verify", response_model=AuthResponse)
async def verify_2fa_otp(data: VerifyOTPRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    otp_code = data.otp_code.strip()

    otp_record = db.query(UserOTP).filter(
        UserOTP.email == email,
        UserOTP.otp_code == otp_code,
        UserOTP.purpose == "2fa_login",
        UserOTP.is_used == False
    ).order_by(UserOTP.created_at.desc()).first()

    if not otp_record or not otp_record.is_valid():
        raise HTTPException(status_code=400, detail="Invalid or expired 2FA code.")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    otp_record.is_used = True
    db.commit()

    token = create_access_token(str(user.id), user.email)
    try:
        user_resp = UserResponse.model_validate(user)
        return AuthResponse(access_token=token, user=user_resp)
    except Exception:
        user_data = {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "image": user.image,
            "onboarding_completed": user.onboarding_completed
        }
        return AuthResponse(access_token=token, user=UserResponse(**user_data))


@router.post("/2fa/toggle")
async def toggle_2fa(
    enable: bool,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.is_2fa_enabled = enable
    db.commit()
    return {"message": f"2FA has been {'enabled' if enable else 'disabled'}.", "is_2fa_enabled": enable}


# ─────────────────────────────────────────────
# MSG91 PHONE VERIFICATION ENDPOINTS
# ─────────────────────────────────────────────

@router.post("/phone/verify", response_model=PhoneVerifyResponse)
async def verify_phone_with_msg91(data: PhoneVerifyRequest, db: Session = Depends(get_db)):
    """
    Verifies an MSG91 access token with MSG91's server endpoint.
    If a user exists matching the verified phone number, marks phone_verified=True,
    issues GrowthOS JWT, and returns full authentication data.
    """
    access_token = data.access_token.strip()
    if not access_token:
        raise HTTPException(status_code=400, detail="MSG91 access token is required.")

    # 1. Verify access token with MSG91
    result = await verify_msg91_access_token(access_token)
    if not result.get("valid"):
        raise HTTPException(
            status_code=400,
            detail=result.get("error") or "Invalid or expired MSG91 access token."
        )

    verified_phone = result.get("phone", "")
    if not verified_phone:
        raise HTTPException(status_code=400, detail="Verified phone identity missing from provider response.")

    # 2. Flexible match GrowthOS user by phone number
    clean_digits = re.sub(r"\D", "", verified_phone)
    last_10 = clean_digits[-10:] if len(clean_digits) >= 10 else clean_digits

    user = db.query(User).filter(
        (User.phone == verified_phone) |
        (User.phone == clean_digits) |
        (User.phone.endswith(last_10))
    ).first()

    if user:
        # Mark phone as verified
        user.phone = verified_phone  # store normalized E.164 phone
        user.phone_verified = True
        user.phone_verified_at = datetime.utcnow()
        db.commit()
        db.refresh(user)

        # Issue GrowthOS JWT
        token = create_access_token(str(user.id), user.email)
        user_resp = UserResponse.model_validate(user)

        return PhoneVerifyResponse(
            success=True,
            verified_phone=verified_phone,
            account_found=True,
            message="Phone authentication successful.",
            access_token=token,
            user=user_resp
        )

    # 3. User does not exist yet for this phone number
    return PhoneVerifyResponse(
        success=True,
        verified_phone=verified_phone,
        account_found=False,
        message="Phone verified successfully. No GrowthOS account is linked to this phone number yet.",
        access_token=None,
        user=None
    )


@router.post("/phone/link")
async def link_phone_with_msg91(
    data: PhoneVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Links a verified MSG91 phone number to the logged-in user's account.
    """
    access_token = data.access_token.strip()
    if not access_token:
        raise HTTPException(status_code=400, detail="MSG91 access token is required.")

    result = await verify_msg91_access_token(access_token)
    if not result.get("valid"):
        raise HTTPException(
            status_code=400,
            detail=result.get("error") or "Invalid or expired MSG91 access token."
        )

    verified_phone = result.get("phone", "")
    if not verified_phone:
        raise HTTPException(status_code=400, detail="Verified phone identity missing from provider response.")

    clean_digits = re.sub(r"\D", "", verified_phone)
    last_10 = clean_digits[-10:] if len(clean_digits) >= 10 else clean_digits

    # Check if another user is using this phone
    existing = db.query(User).filter(
        (User.id != current_user.id) &
        ((User.phone == verified_phone) | (User.phone == clean_digits) | (User.phone.endswith(last_10)))
    ).first()

    if existing:
        raise HTTPException(status_code=409, detail="This phone number is already linked to another GrowthOS account.")

    current_user.phone = verified_phone
    current_user.phone_verified = True
    current_user.phone_verified_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)

    return {
        "success": True,
        "message": "Phone number successfully linked and verified.",
        "user": UserResponse.model_validate(current_user)
    }

