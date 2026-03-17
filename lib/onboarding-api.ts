// lib/onboarding-api.ts
// All frontend API calls for onboarding steps → FastAPI backend
import { getToken } from "./api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const DEFAULT_TIMEOUT = 15000; // 15 seconds

async function fetchWithTimeout(resource: string, options: any = {}) {
  const { timeout = DEFAULT_TIMEOUT } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

async function post(path: string, body: object) {
  try {
    const res = await fetchWithTimeout(`${API}${path}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Request failed");
    }
    return res.json();
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error("Request timed out. Please check if the backend is running.");
    throw err;
  }
}

export async function getOnboardingStatus() {
  try {
    const res = await fetchWithTimeout(`${API}/onboarding/status`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch onboarding status");
    return res.json();
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error("Request timed out. Please check if the backend is running.");
    throw err;
  }
}

export const saveStep1 = (user_type: string) =>
  post("/onboarding/step1", { user_type });

export const saveStep2 = (data: {
  full_name?: string;
  age_group?: string;
  country?: string;
  primary_goal?: string;
}) => post("/onboarding/step2", data);

export const saveStep3 = (daily_time: string) =>
  post("/onboarding/step3", { daily_time });

export const saveStep4 = (interests: string[]) =>
  post("/onboarding/step4", { interests });

export const saveStep5Student = (data: {
  education_level?: string;
  field_of_study?: string;
  career_goal?: string;
}) => post("/onboarding/step5/student", data);

export const saveStep5Freelancer = (data: {
  primary_skill?: string;
  experience_level?: string;
  monthly_income_goal?: string;
  services_offered?: string[];
}) => post("/onboarding/step5/freelancer", data);

export const saveStep5Business = (data: {
  business_type?: string;
  team_size?: string;
  revenue_stage?: string;
  business_goal?: string;
}) => post("/onboarding/step5/business", data);

export const saveStep5Creator = (data: {
  creator_platform?: string;
  content_niche?: string;
  audience_size?: string;
  creator_growth_goal?: string;
}) => post("/onboarding/step5/creator", data);

export const saveStep5Exam = (data: {
  exam_type?: string;
  attempt_year?: string;
  study_hours_daily?: string;
  weak_subjects?: string[];
}) => post("/onboarding/step5/exam", data);

export const saveStep6 = (productivity_style: string) =>
  post("/onboarding/step6", { productivity_style });

export const saveStep7 = (twelve_month_goal: string) =>
  post("/onboarding/step7", { twelve_month_goal });

export const skipOnboarding = () =>
  post("/onboarding/skip", {});
