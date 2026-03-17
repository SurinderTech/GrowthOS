// lib/dashboard-api.ts
// All frontend API calls for the dashboard → FastAPI backend

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TIMEOUT = 25000; // 25 seconds timeout

// ── Auth Helpers ──────────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem("access_token") || "";
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

// ── Fetch with Timeout ────────────────────────────────────────────────────────

async function fetchWithTimeout(
  resource: string,
  options: RequestInit & { timeout?: number } = {}
) {
  const { timeout = TIMEOUT, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, { ...rest, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// ── Core GET / POST ───────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  try {
    const res = await fetchWithTimeout(`${API}${path}`, { headers: authHeaders() });
    if (!res.ok) {
      const text = await res.text();
      console.error("API error:", text);
      throw new Error(text || "API Request failed");
    }
    return res.json();
  } catch (err: any) {
    if (err.name === "AbortError") throw new Error("Request timed out. Please try again.");
    throw err;
  }
}

async function post<T>(path: string, body: object = {}): Promise<T> {
  try {
    const res = await fetchWithTimeout(`${API}${path}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("API error:", text);
      throw new Error(text || "API Request failed");
    }
    return res.json();
  } catch (err: any) {
    if (err.name === "AbortError") throw new Error("Request timed out. Please try again.");
    throw err;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DashboardData {
  user_name: string;
  user_type: string;
  primary_goal: string;
  twelve_month_goal: string;
  onboarding_completed: boolean;
  growth_plan_generated: boolean;
}

export interface GrowthMilestone {
  id: string;
  title: string;
  description: string;
  week: number;
  completed: boolean;
}

export interface GrowthMonth {
  month: number;
  label: string;
  theme: string;
  milestones: GrowthMilestone[];
  progress: number;
}

export interface GrowthPlan {
  id: string;
  title: string;
  summary: string;
  months: GrowthMonth[];
  generated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
  estimated_minutes: number;
  category: string;
  resource_url?: string;      // ← ADD
  action_type?: string;       // ← ADD
}

export interface Skill {
  id: string;
  name: string;
  emoji: string;
  level: string;
  relevance_score: number;
  why_relevant: string;
  resource_url?: string;      // ← ADD
  platform?: string;          // ← ADD
  learn_path?: string[];      // ← ADD
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  type: string;
  emoji: string;
  action_label: string;
  urgency: "now" | "this_week" | "this_month";
  action_url?: string;        // ← ADD
  platform?: string;          // ← ADD
  steps?: string[];           // ← ADD
}

export interface Mission {
  id: string;
  user_id: string;
  title: string;
  type: "practice" | "review" | "project" | "learning";
  completed: boolean;
  deadline: string;
  date: string;
}

export interface MissionControlData {
  greeting: string;
  missions: Mission[];
  completed_count: number;
  total_count: number;
  streak: number;
  deadline: string;
}

export interface BatchActivityItem {
  id: string;
  user_id: string;
  user_name: string;
  avatar: string;
  activity_type: string;
  activity_text: string;
  created_at: string;
}

export interface AccountabilityMessage {
  message: string;
  type: "warning" | "motivational" | "celebration" | "none";
  show: boolean;
}

// ── Practice Arena Types (new — matches backend models/practice.py) ───────────

export interface PracticeQuestion {
  id: string;
  topic: string;
  subtopic: string | null;
  difficulty: "easy" | "medium" | "hard";
  q_type: "mcq" | "short" | "numeric" | "coding" | "statement";
  question_text: string;
  options: string[] | null;
  // correct_answer intentionally omitted — only returned after submission
}

export interface PracticeSession {
  session_id: string;
  questions: PracticeQuestion[];
  topic_focus: string;   // e.g. "JEE Practice", "Python Skills"
  user_type: string;
  total_questions: number;
}

export interface AnswerResult {
  is_correct: boolean;
  correct_answer: string | null;
  explanation: string;
  feedback: string | null;   // Gemini feedback for short/coding answers
  skill_delta: number;       // how many % points this answer earned
}

export interface SessionResult {
  correct_count: number;
  total_count: number;
  accuracy_pct: number;
  new_streak: number;
  streak_updated: boolean;
  longest_streak: number;
  skill_updates: {
    topic: string;
    old_pct: number;
    new_pct: number;
    delta: number;
  }[];
}

export interface StreakStatus {
  current_streak: number;
  longest_streak: number;
  last_practice_date: string | null;
  practiced_today: boolean;
}

export interface SkillProgressItem {
  topic: string;
  progress_pct: number;
  updated_at: string;
}

// ── Dashboard APIs ────────────────────────────────────────────────────────────

export const getDashboard     = ()               => get<DashboardData>("/dashboard/");
export const getGrowthPlan    = ()               => get<GrowthPlan>("/dashboard/growth-plan");
export const getTodayTasks    = ()               => get<Task[]>("/dashboard/tasks/today");
export const getSkills        = ()               => get<Skill[]>("/dashboard/skills");
export const getOpportunities = ()               => get<Opportunity[]>("/dashboard/opportunities");
export const getAIInsight     = ()               => get<{ insight: string }>("/dashboard/ai-insight");
export const regeneratePlan   = ()               => post<GrowthPlan>("/dashboard/regenerate-plan");
export const completeTask     = (id: string)     => post<void>(`/dashboard/tasks/${id}/complete`);
export const uncompleteTask   = (id: string)     => post<void>(`/dashboard/tasks/${id}/uncomplete`);
export const askAI            = (message: string)=> post<{ reply: string }>("/dashboard/ask-ai", { message });

export const getCareerGraph = (force = false) =>
  get<{ nodes: any[]; edges: any[] }>(
    `/dashboard/career-graph${force ? "?force_regenerate=true" : ""}`
  );

export const getCareerJobs      = ()             => get<any>("/dashboard/career-jobs");
export const getCareerSkills    = (jobId: string)=> get<any>(`/dashboard/career-skills/${jobId}`);
export const getCareerSubskills = (s: string)    => get<any>(`/dashboard/career-subskills/${s}`);

// ── Practice Arena APIs ───────────────────────────────────────────────────────

/**
 * Get today's personalized questions.
 * Backend reads JWT → loads UserOnboarding → picks correct question type:
 *   JEE aspirant     → Physics / Chemistry / Math MCQ + numeric
 *   NEET aspirant    → Biology / Physics / Chemistry MCQ
 *   UPSC aspirant    → History / Polity statement-based MCQ
 *   CS student       → Python / DSA / Algorithms coding + MCQ
 *   Medical student  → Anatomy / Physiology clinical MCQ
 *   Freelancer       → skill-specific coding + scenario questions
 *   Entrepreneur     → business strategy scenarios
 *   Creator          → platform growth + content strategy
 */
export const getPracticeSession = (count = 5) =>
  get<PracticeSession>(`/practice/session?count=${count}`);

/**
 * Submit one answer. Returns instant result.
 * MCQ / numeric → instant string comparison (no AI call)
 * short / coding → Gemini evaluates (one small AI call)
 */
export const submitPracticeAnswer = (data: {
  session_id: string;
  question_id: string;
  user_answer: string;
  time_taken_s?: number;
}) =>
  post<AnswerResult>("/practice/answer", {
    ...data,
    time_taken_s: data.time_taken_s ?? 0,
  });

/**
 * Call when user finishes all questions.
 * Backend: updates streak + skill progress + saves session summary.
 */
export const completePracticeSession = (session_id: string) =>
  post<SessionResult>("/practice/complete", { session_id });

/** Current streak status for the logged-in user. */
export const getPracticeStreak = () =>
  get<StreakStatus>("/practice/streak");

/** All topics the user has practiced + their % progress. */
export const getSkillProgress = () =>
  get<SkillProgressItem[]>("/practice/progress");

// ── Mission Control APIs ──────────────────────────────────────────────────────

export const getMissionControl = (userId: string) =>
  get<MissionControlData>(`/missions/today?user_id=${userId}`);

export const completeMission = (userId: string, missionId: string) =>
  post<void>("/missions/complete", { user_id: userId, mission_id: missionId });

// ── Batch Activity Feed API ───────────────────────────────────────────────────

export const getBatchActivity = async (
  userId: string,
  limit = 10
): Promise<BatchActivityItem[]> => {
  const data = await get<{ activities: BatchActivityItem[] }>(
    `/activity/feed?user_id=${userId}&limit=${limit}`
  );
  return data.activities;
};

// ── AI Accountability API ─────────────────────────────────────────────────────

export const getAccountabilityMessage = (userId: string) =>
  get<AccountabilityMessage>(`/accountability/message?user_id=${userId}`);