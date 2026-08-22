// lib/api.ts
// All communication with your Python FastAPI backend goes through here.
// Change NEXT_PUBLIC_API_URL in .env.local to point to your FastAPI server.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const DEFAULT_TIMEOUT = 15000; // 15 seconds

async function fetchWithTimeout(resource: string, options: any = {}) {
  const { timeout = DEFAULT_TIMEOUT } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

// ── Helper: get the JWT token stored in localStorage
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

// ── Helper: save token after login/signup
export function saveToken(token: string): void {
  localStorage.setItem("access_token", token);
}

// ── Helper: remove token on logout
export function removeToken(): void {
  localStorage.removeItem("access_token");
  localStorage.removeItem("growthos_user");
  localStorage.removeItem("user_name");
}

// ── Helper: save user info
export function saveUser(user: object): void {
  localStorage.setItem("growthos_user", JSON.stringify(user));
  // ── ADD THESE TWO LINES ──
  const u = user as any;
  const name = u?.name || u?.email?.split("@")[0] || "User";
  localStorage.setItem("user_name", name);
}

// ── Helper: get saved user
export function getUser(): any | null {
  if (typeof window === "undefined") return null;
  const u = localStorage.getItem("growthos_user");
  return u ? JSON.parse(u) : null;
}

// ── Helper: check if logged in
export function isLoggedIn(): boolean {
  return !!getToken();
}

// ─────────────────────────────────────────
// AUTH API CALLS
// ─────────────────────────────────────────

// POST /auth/register — create new account
export async function apiRegister(data: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  turnstile_token?: string;
}) {
  try {
    const res = await fetchWithTimeout(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.detail || "Registration failed");
    return json; // returns { access_token, token_type, user }
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Please check if the backend is running.");
    }
    throw err;
  }
}

// POST /auth/verify-email — verify token and mark email_verified = true
export async function apiVerifyEmail(token: string) {
  const res = await fetchWithTimeout(`${API_URL}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail || "Email verification failed.");
  return json;
}

// POST /auth/resend-verification — resend verification email link
export async function apiResendVerification(email?: string) {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetchWithTimeout(`${API_URL}/auth/resend-verification`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail || "Failed to resend verification email.");
  return json;
}

// POST /auth/login — sign in with email + password
export async function apiLogin(email: string, password: string) {
  // FastAPI OAuth2 expects form data for /auth/token
  const formData = new URLSearchParams();
  formData.append("username", email); // FastAPI uses "username" field name
  formData.append("password", password);

  try {
    const res = await fetchWithTimeout(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.detail || "Login failed");
    return json; // returns { access_token, token_type, user }
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Please check if the backend is running.");
    }
    throw err;
  }
}

// GET /auth/me — get current logged-in user info
export async function apiGetMe() {
  const token = getToken();
  if (!token) throw new Error("Not logged in");

  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.detail || "Failed to get user");
  return json;
}

// Google OAuth — redirect directly to Google OAuth endpoint (never to backend directly)
export function loginWithGoogle() {
  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    "152168838416-hsqvd9ph168d6r5c5djitepan7ldqeu2.apps.googleusercontent.com";
  const redirectUri = `${window.location.origin}/auth/callback`;
  const scope = encodeURIComponent("openid email profile");
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${scope}&prompt=select_account`;

  window.location.href = authUrl;
}

// POST /auth/google/verify — verify Google auth code with FastAPI backend
export async function apiVerifyGoogleCode(code: string, redirectUri: string) {
  try {
    const res = await fetchWithTimeout(`${API_URL}/auth/google/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
      timeout: 45000, // 45 second timeout to handle Render cold-start wake-up
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.detail || "Google authentication failed.");
    }
    return json; // returns { access_token, token_type, user }
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("Backend verification timed out while waking up cloud resources.");
    }
    throw err;
  }
}

// GET /auth/facebook — redirect to Facebook OAuth
export function loginWithFacebook() {
  window.location.href = `${API_URL}/auth/facebook`;
}

// GET /auth/linkedin — redirect to LinkedIn OAuth
export function loginWithLinkedIn() {
  window.location.href = `${API_URL}/auth/linkedin`;
}


// ─────────────────────────────────────────
// OTP & FORGOT PASSWORD API CALLS
// ─────────────────────────────────────────

// POST /auth/forgot-password/request-otp
export async function requestForgotPasswordOTP(email: string) {
  const res = await fetchWithTimeout(`${API_URL}/auth/forgot-password/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, purpose: "password_reset" }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail || "Failed to request OTP code");
  return json;
}

// POST /auth/forgot-password/verify-otp
export async function verifyForgotPasswordOTP(email: string, otpCode: string) {
  const res = await fetchWithTimeout(`${API_URL}/auth/forgot-password/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp_code: otpCode, purpose: "password_reset" }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail || "Invalid OTP code");
  return json;
}

// POST /auth/forgot-password/reset-password
export async function resetPasswordWithOTP(email: string, otpCode: string, newPassword: string) {
  const res = await fetchWithTimeout(`${API_URL}/auth/forgot-password/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp_code: otpCode, new_password: newPassword }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail || "Failed to reset password");
  return json;
}

// POST /auth/2fa/verify
export async function verify2FAOTP(email: string, otpCode: string) {
  const res = await fetchWithTimeout(`${API_URL}/auth/2fa/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp_code: otpCode, purpose: "2fa_login" }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail || "2FA verification failed");
  return json;
}

// ─────────────────────────────────────────
// MSG91 PHONE VERIFICATION API CALLS
// ─────────────────────────────────────────

// POST /auth/phone/verify — verify MSG91 access token & log in if user exists
export async function apiVerifyPhoneWithMSG91(accessToken: string) {
  const res = await fetchWithTimeout(`${API_URL}/auth/phone/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: accessToken }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail || "MSG91 phone verification failed.");
  return json; // returns { success, verified_phone, account_found, message, access_token, user }
}

// POST /auth/phone/link — link verified phone to authenticated account
export async function apiLinkPhoneWithMSG91(accessToken: string) {
  const token = getToken();
  if (!token) throw new Error("Not logged in.");

  const res = await fetchWithTimeout(`${API_URL}/auth/phone/link`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ access_token: accessToken }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail || "Failed to link phone number.");
  return json;
}