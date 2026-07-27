// lib/agents-api.ts
// Frontend API calls for the four new agent workspaces: Resume, Interview,
// Project, and Networking. Mirrors the conventions in lib/dashboard-api.ts.

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TIMEOUT = 25000;

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : "";
}

function authHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
}

async function fetchWithTimeout(resource: string, options: RequestInit & { timeout?: number } = {}) {
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

async function get<T>(path: string): Promise<T> {
  const res = await fetchWithTimeout(`${API}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function post<T>(path: string, body: object = {}): Promise<T> {
  const res = await fetchWithTimeout(`${API}${path}`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function patch<T>(path: string, body: object = {}): Promise<T> {
  const res = await fetchWithTimeout(`${API}${path}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function del<T>(path: string): Promise<T> {
  const res = await fetchWithTimeout(`${API}${path}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Resume Agent ──────────────────────────────────────────────────────────────

export interface ResumeAnalysis {
  id: string;
  ats_score: number;
  strengths: string[];
  improvements: string[];
  summary: string;
  created_at: string;
}
export interface ResumeSummary {
  latest: ResumeAnalysis | null;
  history: ResumeAnalysis[];
  total_analyses: number;
}

export const getResumeSummary = () => get<ResumeSummary>("/agents/resume/");
export const analyzeResume = (resume_text: string) =>
  post<ResumeAnalysis>("/agents/resume/analyze", { resume_text });

// ── Interview Agent ───────────────────────────────────────────────────────────

export interface InterviewSession {
  id: string;
  role: string;
  questions: string[];
  answers: Record<string, { answer: string; feedback: string; score: number }>;
  status: "in_progress" | "completed";
  overall_score: number | null;
  overall_feedback: string | null;
  created_at: string;
}
export interface InterviewSummary {
  latest: InterviewSession | null;
  history: InterviewSession[];
  total_sessions: number;
}

export const getInterviewSummary = () => get<InterviewSummary>("/agents/interview/");
export const startInterview = (role: string, question_count = 5) =>
  post<InterviewSession>("/agents/interview/start", { role, question_count });
export const answerInterviewQuestion = (sessionId: string, question_index: number, answer: string) =>
  post<{ feedback: string; score: number }>(`/agents/interview/${sessionId}/answer`, { question_index, answer });
export const completeInterview = (sessionId: string) =>
  post<InterviewSession>(`/agents/interview/${sessionId}/complete`, {});

// ── Project Agent ─────────────────────────────────────────────────────────────

export type ProjectStatus = "idea" | "in_progress" | "completed";
export interface ProjectItem {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  github_url: string | null;
  created_at: string;
  updated_at: string | null;
}

export const getProjects = () => get<ProjectItem[]>("/agents/projects/");
export const createProject = (data: { title: string; description?: string; status?: ProjectStatus; github_url?: string }) =>
  post<ProjectItem>("/agents/projects/", data);
export const updateProject = (id: string, data: Partial<{ title: string; description: string; status: ProjectStatus; github_url: string }>) =>
  patch<ProjectItem>(`/agents/projects/${id}`, data);
export const deleteProject = (id: string) => del<{ deleted: boolean }>(`/agents/projects/${id}`);

// ── Networking Agent ───────────────────────────────────────────────────────────

export type ContactStatus = "to_reach" | "contacted" | "replied" | "connected";
export interface ContactItem {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  platform: string;
  status: ContactStatus;
  notes: string | null;
  last_message: string | null;
  created_at: string;
}

export const getContacts = () => get<ContactItem[]>("/agents/networking/");
export const createContact = (data: { name: string; role?: string; company?: string; platform?: string; notes?: string }) =>
  post<ContactItem>("/agents/networking/", data);
export const updateContact = (id: string, data: Partial<{ name: string; role: string; company: string; platform: string; status: ContactStatus; notes: string }>) =>
  patch<ContactItem>(`/agents/networking/${id}`, data);
export const deleteContact = (id: string) => del<{ deleted: boolean }>(`/agents/networking/${id}`);
export const draftOutreachMessage = (id: string) => post<{ message: string }>(`/agents/networking/${id}/draft-message`, {});
