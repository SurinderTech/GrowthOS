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
from dotenv import load_dotenv
from Backend.schemas.auth import RegisterRequest, AuthResponse
from Backend.schemas.user import UserResponse

from Backend.db.session import get_db
from Backend.models.onboarding import UserOnboarding
from datetime import datetime
from Backend.models.user import User
from auth import hash_password, verify_password, create_access_token, get_current_user

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
    "scope": "r_liteprofile r_emailaddress",
    "token_endpoint_auth_method": "client_secret_post",
},
)

# ─────────────────────────────────────────────
# POST /auth/register
# Creates a new user with hashed password
# ─────────────────────────────────────────────
@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(data: RegisterRequest, db: Session = Depends(get_db)):
    # Trim whitespace and lowercase email
    email = data.email.strip().lower()
    password = data.password.strip()

    # Check if email already used
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # Create user
    user = User(
        email=email,
        name=f"{data.first_name.strip()} {data.last_name.strip()}",
        hashed_password=hash_password(password),
        provider="credentials",
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    print(f"User registered: {user.email} (ID: {user.id})")

    token = create_access_token(str(user.id), user.email)

    try:
        user_resp = UserResponse.model_validate(user)
        return AuthResponse(access_token=token, user=user_resp)
    except Exception as e:
        print(f"DEBUG: Registration validation failed for {user.email}: {e}")
        # Fallback to dictionary mapping if validation fails
        user_data = {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "image": user.image,
            "onboarding_completed": user.onboarding_completed
        }
        return AuthResponse(access_token=token, user=UserResponse(**user_data))

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
    
    from auth import hash_password
    user.hashed_password = hash_password(new_password.strip())
    db.commit()
    return {"message": f"Password successfully updated for {email}. You can now log in with the new password."}


# ─────────────────────────────────────────────
# GET /auth/me
# Returns current logged-in user's info
# ─────────────────────────────────────────────
@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    try:
        return UserResponse.model_validate(current_user)
    except Exception:
        return UserResponse(
            id=current_user.id,
            email=current_user.email,
            name=current_user.name,
            image=current_user.image,
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
    token = await oauth.google.authorize_access_token(request)
    info  = token.get("userinfo")

    user = db.query(User).filter(User.email == info["email"].lower()).first()
    if not user:
        user = User(
            email=info["email"].lower(),
            name=info.get("name"),
            image=info.get("picture"),
            provider="google",
            provider_id=info["sub"],
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(str(user.id), user.email)
    # Redirect back to frontend with token in URL
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={access_token}")


# ─────────────────────────────────────────────
# FACEBOOK OAUTH
# ─────────────────────────────────────────────
@router.get("/facebook")
async def facebook_login(request: Request):
    redirect_uri = f"{request.base_url}auth/facebook/callback"
    return await oauth.facebook.authorize_redirect(request, redirect_uri)


@router.get("/facebook/callback")
async def facebook_callback(request: Request, db: Session = Depends(get_db)):
    token = await oauth.facebook.authorize_access_token(request)
    resp  = await oauth.facebook.get("me?fields=id,name,email,picture", token=token)
    info  = resp.json()

    email = info.get("email")
    if not email:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=Facebook+did+not+return+email")

    user = db.query(User).filter(User.email == email.lower()).first()
    if not user:
        user = User(
            email=email.lower(),
            name=info.get("name"),
            image=info.get("picture", {}).get("data", {}).get("url"),
            provider="facebook",
            provider_id=info["id"],
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(str(user.id), user.email)
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={access_token}")


# ─────────────────────────────────────────────
# LINKEDIN OAUTH
# ─────────────────────────────────────────────
@router.get("/linkedin/callback")
async def linkedin_callback(request: Request, db: Session = Depends(get_db)):
    token = await oauth.linkedin.authorize_access_token(request)

    # Get profile
    profile_resp = await oauth.linkedin.get(
        "me",
        token=token
    )
    profile = profile_resp.json()

    # Get email
    email_resp = await oauth.linkedin.get(
        "emailAddress?q=members&projection=(elements*(handle~))",
        token=token
    )
    email_data = email_resp.json()

    email = email_data["elements"][0]["handle~"]["emailAddress"]

    name = profile.get("localizedFirstName", "") + " " + profile.get("localizedLastName", "")

    user = db.query(User).filter(User.email == email.lower()).first()

    if not user:
        user = User(
            email=email.lower(),
            name=name,
            provider="linkedin",
            provider_id=profile.get("id"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(str(user.id), user.email)

    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={access_token}")
from pydantic import BaseModel
from typing import Optional

class ProfileUpdateRequest(BaseModel):
    name:    Optional[str] = None
    bio:     Optional[str] = None
    country: Optional[str] = None
    phone:   Optional[str] = None

@router.patch("/profile")
def update_profile(
    req: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if req.name is not None and req.name.strip():
        current_user.name = req.name.strip()

    current_user.updated_at = datetime.utcnow()

    # Update country in onboarding if it exists
    if req.country is not None:
        ob = db.query(UserOnboarding).filter(
            UserOnboarding.user_id == current_user.id
        ).first()
        if ob:
            ob.country = req.country.strip()

    db.commit()
    db.refresh(current_user)

    return {
        "success": True,
        "user": {
            "name":  current_user.name,
            "email": current_user.email,
        }
    }