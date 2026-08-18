from pydantic import BaseModel, EmailStr
from typing import Optional

from Backend.schemas.user import UserResponse


class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class RequestOTPRequest(BaseModel):
    email: EmailStr
    purpose: str = "password_reset"  # "password_reset" or "2fa_login"


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp_code: str
    purpose: str = "password_reset"


class ResetPasswordWithOTPRequest(BaseModel):
    email: EmailStr
    otp_code: str
    new_password: str


class OTPResponse(BaseModel):
    message: str
    success: bool = True


class PhoneVerifyRequest(BaseModel):
    access_token: str


class PhoneVerifyResponse(BaseModel):
    success: bool
    verified_phone: str
    account_found: bool
    message: str
    access_token: Optional[str] = None
    user: Optional[UserResponse] = None