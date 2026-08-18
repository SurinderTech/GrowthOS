// lib/learning-agent-api.ts
//
// Shared types + API client for the Learning Agent Workspace (Phase 2).
//
// Scope: Goal Board, current-week Roadmap, Today's Mission, Learning Workspace
// (per-topic), AI Tutor, Resource Engine, Progress summary (lightweight, no
// historical analytics). Practice Arena is intentionally NOT modeled here —
// it's a redirect into the existing dashboard Practice Arena.
//
// Every fetch function fails soft: on error it returns a typed mock so the
// workspace always renders something useful for a first-time user, instead
// of blank states while the real backend is still catching up. Replace the
// MOCK_* objects with nothing once your endpoints are live — the shape is
// the contract, the mocks are just a development crutch.

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : "";
}

async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status} ${path}`);
  return res.json();
}

// ── Types ────────────────────────────────────────────────────────────────

export interface GoalBoardData {
  name: string;
  career_goal: string;
  current_level: string;
  target_timeline: string;
  daily_study_hours: number;
  current_week: number;
  today_completion_pct: number; // 0-100
  estimated_journey_weeks?: number;
}

export type MissionType = "topic" | "practice" | "project";

export interface DailyMissionItem {
  id: string;
  type: MissionType;
  title: string;
  estimated_minutes: number;
  completed: boolean;
  topic_id?: string; // present when type === "topic", used to open the Learning Workspace
}

export interface TodayMission {
  date: string;
  estimated_minutes_total: number;
  items: DailyMissionItem[];
}

export interface RoadmapDay {
  day_label: string;   // "Mon", "Day 1"...
  date: string;
  theme: string;
  is_today: boolean;
  is_locked: boolean;
  mission_item_ids: string[];
  topic_titles: string[];
}

export interface WeeklyRoadmap {
  week_number: number;
  week_theme: string;
  objectives: string[];
  days: RoadmapDay[];
  next_week_locked: true;
}

export interface CodeSnippet {
  language: string;
  code: string;
  caption?: string;
}

export interface PracticeQuestion {
  id: string;
  prompt: string;
  kind: "mcq" | "short_answer" | "coding";
  options?: string[];
  answered?: boolean;
}

export interface TopicDetail {
  id: string;
  title: string;
  week_number: number;
  explanation_md: string;
  examples: { title: string; body: string }[];
  code_snippets: CodeSnippet[];
  practice_questions: PracticeQuestion[];
  notes: string;
  completed: boolean;
  estimated_minutes: number;
}

export interface ResourceItem {
  title: string;
  url: string;
  source: string;
  duration?: string;
}

export interface TopicResources {
  best_video?: ResourceItem;
  best_article?: ResourceItem;
  official_docs?: ResourceItem;
  project?: ResourceItem;
  more: ResourceItem[];
}

export interface ProgressSummary {
  topics_completed: number;
  topics_total: number;
  missions_completed: number;
  missions_total: number;
  practice_completion_pct: number;
  study_minutes_today: number;
  study_minutes_goal: number;
}

export interface TutorMessage {
  id: string;
  role: "user" | "tutor";
  text: string;
}

export interface TutorContext {
  topic_id?: string;
  topic_title?: string;
}

// ── Career Discovery → Week 1 commit ───────────────────────────────────

export interface RoadmapStatus {
  week1_committed: boolean;
  destination: string;          // career goal, human-readable
  estimated_journey_weeks: number;
}

export interface ExplorationSignal {
  node_id: string;
  seconds_spent: number;
  expanded: boolean;
}

export interface CommitWeek1Payload {
  chosen_path_id: string;       // e.g. "frontend" | "backend" | "full_stack" | "ai_ml"
  exploration_signals: ExplorationSignal[];
  ai_question_answer?: "yes" | "no" | "full_stack" | null;
}

// ── Mocks (fallback only — real data should come from the backend) ────────

const MOCK_GOAL_BOARD: GoalBoardData = {
  name: "Learner",
  career_goal: "Personalized Mastery Plan",
  current_level: "Intermediate",
  target_timeline: "6 months",
  daily_study_hours: 2,
  current_week: 1,
  today_completion_pct: 25,
  estimated_journey_weeks: 28,
};

const MOCK_TODAY_MISSION: TodayMission = {
  date: new Date().toISOString(),
  estimated_minutes_total: 140,
  items: [
    { id: "m1", type: "topic", title: "Domain Foundations", estimated_minutes: 30, completed: true, topic_id: "t1" },
    { id: "m2", type: "topic", title: "Core Concepts & Practice", estimated_minutes: 30, completed: false, topic_id: "t2" },
    { id: "m3", type: "practice", title: "Solve High-Yield Questions", estimated_minutes: 30, completed: false },
    { id: "m4", type: "project", title: "Hands-on Mastery Drill", estimated_minutes: 50, completed: false },
  ],
};

const MOCK_ROADMAP: WeeklyRoadmap = {
  week_number: 1,
  week_theme: "Core Domain Foundations",
  objectives: [
    "Master essential domain concepts and principles",
    "Apply high-yield problem solving techniques",
    "Complete practical drills and assessments",
  ],
  days: [
    { day_label: "Mon", date: "", theme: "Core Concepts", is_today: true, is_locked: false, mission_item_ids: ["m1"], topic_titles: ["Foundations", "Principles"] },
    { day_label: "Tue", date: "", theme: "Practice & Drills", is_today: false, is_locked: false, mission_item_ids: ["m2"], topic_titles: ["Problem Solving", "Drills"] },
    { day_label: "Wed", date: "", theme: "Deep Dive", is_today: false, is_locked: false, mission_item_ids: [], topic_titles: ["Advanced Concepts"] },
    { day_label: "Thu", date: "", theme: "Practice Day", is_today: false, is_locked: false, mission_item_ids: [], topic_titles: ["Mixed Practice"] },
    { day_label: "Fri", date: "", theme: "Mastery Project", is_today: false, is_locked: false, mission_item_ids: [], topic_titles: ["Mastery Project"] },
    { day_label: "Sat", date: "", theme: "Revision", is_today: false, is_locked: false, mission_item_ids: [], topic_titles: ["Review"] },
    { day_label: "Sun", date: "", theme: "Rest / Buffer", is_today: false, is_locked: false, mission_item_ids: [], topic_titles: [] },
  ],
  next_week_locked: true,
};

const MOCK_TOPICS: Record<string, TopicDetail> = {
  t1: {
    id: "t1",
    title: "Domain Fundamentals",
    week_number: 1,
    explanation_md:
      "Core principles and step-by-step breakdown of key domain concepts.",
    examples: [
      { title: "Core Principle Overview", body: "Detailed explanation of key principles and methodology." },
    ],
    code_snippets: [
      { language: "concept", code: "// Key Reference / Formula / Strategy\nConcept = Core Domain Pattern", caption: "Key Reference Formula" },
    ],
    practice_questions: [
      { id: "q1", kind: "mcq", prompt: "What is the primary condition for core domain success?", options: ["Deep understanding & practice", "Random guessing", "Ignoring fundamentals"] },
    ],
    notes: "",
    completed: true,
    estimated_minutes: 30,
  },
};

const MOCK_RESOURCES: Record<string, TopicResources> = {
  t1: {
    best_video: { title: "In-Depth Masterclass", url: "https://youtube.com", source: "GrowthOS Academy", duration: "20:00" },
    best_article: { title: "Comprehensive Study Notes & Guide", url: "#", source: "GrowthOS Notes" },
    official_docs: { title: "Official Reference Guide", url: "#", source: "GrowthOS Docs" },
    project: { title: "Hands-on Mastery Drill", url: "#", source: "GrowthOS Projects" },
    more: [],
  },
};

const MOCK_PROGRESS: ProgressSummary = {
  topics_completed: 1,
  topics_total: 5,
  missions_completed: 1,
  missions_total: 4,
  practice_completion_pct: 20,
  study_minutes_today: 35,
  study_minutes_goal: 180,
};

const MOCK_ROADMAP_STATUS: RoadmapStatus = {
  week1_committed: false,
  destination: "Personalized Mastery Plan",
  estimated_journey_weeks: 28,
};

// ── API functions ───────────────────────────────────────────────────────

export async function getGoalBoard(): Promise<GoalBoardData> {
  try { return await authedFetch<GoalBoardData>("/api/learning-agent/goal-board"); }
  catch { return MOCK_GOAL_BOARD; }
}

export async function getRoadmapStatus(): Promise<RoadmapStatus> {
  try { return await authedFetch<RoadmapStatus>("/api/learning-agent/roadmap/status"); }
  catch { return MOCK_ROADMAP_STATUS; }
}

export async function commitWeek1(payload: CommitWeek1Payload): Promise<void> {
  try {
    await authedFetch("/api/learning-agent/roadmap/commit", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-blocking: the UI already transitions optimistically into Week 1.
    // A background sync/retry layer can be added later without changing
    // this function's contract.
  }
}

export async function getCurrentWeekRoadmap(): Promise<WeeklyRoadmap> {
  try { return await authedFetch<WeeklyRoadmap>("/api/learning-agent/roadmap/current-week"); }
  catch { return MOCK_ROADMAP; }
}

export async function getTodayMission(): Promise<TodayMission> {
  try { return await authedFetch<TodayMission>("/api/learning-agent/missions/today"); }
  catch { return MOCK_TODAY_MISSION; }
}

export async function toggleMissionItem(itemId: string, completed: boolean): Promise<void> {
  try {
    await authedFetch(`/api/learning-agent/missions/today/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    });
  } catch { /* optimistic UI already applied by caller */ }
}

export async function getTopic(topicId: string): Promise<TopicDetail> {
  try { return await authedFetch<TopicDetail>(`/api/learning-agent/topics/${topicId}`); }
  catch { return MOCK_TOPICS[topicId] || MOCK_TOPICS.variables; }
}

export async function saveTopicNotes(topicId: string, notes: string): Promise<void> {
  try {
    await authedFetch(`/api/learning-agent/topics/${topicId}`, {
      method: "PATCH",
      body: JSON.stringify({ notes }),
    });
  } catch { /* non-blocking */ }
}

export async function markTopicComplete(topicId: string, completed: boolean): Promise<void> {
  try {
    await authedFetch(`/api/learning-agent/topics/${topicId}`, {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    });
  } catch { /* non-blocking */ }
}

export async function getTopicResources(topicId: string): Promise<TopicResources> {
  try { return await authedFetch<TopicResources>(`/api/learning-agent/topics/${topicId}/resources`); }
  catch { return MOCK_RESOURCES[topicId] || MOCK_RESOURCES.variables; }
}

export async function getProgressSummary(): Promise<ProgressSummary> {
  try { return await authedFetch<ProgressSummary>("/api/learning-agent/progress/summary"); }
  catch { return MOCK_PROGRESS; }
}

export async function askTutor(message: string, context: TutorContext, history: TutorMessage[]): Promise<string> {
  try {
    const data = await authedFetch<{ reply: string }>("/api/learning-agent/tutor/message", {
      method: "POST",
      body: JSON.stringify({ message, context, history: history.slice(-10) }),
    });
    return data.reply;
  } catch {
    // Soft fallback so the tutor never feels "broken" during development.
    return mentorFallback(message, context);
  }
}

function mentorFallback(message: string, context: TutorContext): string {
  const topic = context.topic_title || "this topic";
  const lower = message.toLowerCase();
  if (lower.includes("quiz")) {
    return `Here's a quick check on ${topic}: try explaining it out loud in one sentence, as if to a beginner. If you hesitate, that's the part we should revisit.`;
  }
  if (lower.includes("note")) {
    return `Noted. I'll fold the key points of ${topic} into a short summary you can revisit later.`;
  }
  if (lower.includes("didn't understand") || lower.includes("dont understand") || lower.includes("don't understand")) {
    return `No problem — let's take ${topic} from a different angle, with a smaller example this time.`;
  }
  return `I'm connected to your ${topic} lesson, but I couldn't reach the tutor service just now. Try again in a moment — your goal and roadmap context are still loaded.`;
}
