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

// GET /auth/google — redirect to Google OAuth
export function loginWithGoogle() {
  window.location.href = `${API_URL}/auth/google`;
}

// GET /auth/facebook — redirect to Facebook OAuth
export function loginWithFacebook() {
  window.location.href = `${API_URL}/auth/facebook`;
}

// GET /auth/linkedin — redirect to LinkedIn OAuth
export function loginWithLinkedIn() {
  window.location.href = `${API_URL}/auth/linkedin`;
}