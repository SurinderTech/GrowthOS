# backend/auth.py
# Two jobs:
# 1. Hash passwords before saving, verify them on login
# 2. Create JWT tokens after login, verify them on protected routes

from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from Backend.db.session import get_db
from Backend.models.user import User
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-change-this")
ALGORITHM  = os.getenv("ALGORITHM", "HS256")
EXPIRE_MIN = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))

# bcrypt hasher — industry standard for passwords
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Tells FastAPI where the token comes from (Authorization: Bearer <token>)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ── Hash a plain password → "$2b$12$xxxx..."
def hash_password(plain_password: str):
    return pwd_context.hash(plain_password[:72])


# ── Compare plain password against stored hash → True/False
def verify_password(plain_password: str, hashed_password: str) -> bool:
    print(f"DEBUG: Verifying password. Plain length: {len(plain_password)}, Hash length: {len(hashed_password)}")
    try:
        result = pwd_context.verify(plain_password, hashed_password)
        print(f"DEBUG: Verification result: {result}")
        return result
    except Exception as e:
        print(f"DEBUG: Verification exception: {e}")
        return False


# ── Create a JWT token that expires after EXPIRE_MIN minutes
def create_access_token(user_id: str, email: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=EXPIRE_MIN)

    payload = {
        "sub": str(user_id),   # convert UUID → string
        "email": email,
        "exp": expire,
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ── Decode and verify a JWT token → returns the payload
def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── Dependency: use in any route that requires login
# Usage: async def my_route(current_user = Depends(get_current_user)):
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_token(token)
    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    return user