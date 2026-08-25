// lib/nova-api.ts
// Client API for NOVA Advanced Intelligence Engine (Steps 1 - 12).

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface NovaChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface NovaChatResponse {
  response: string;
  execution_stage: string;
  state: Record<string, any>;
}

export interface MemoryRecord {
  id: string;
  user_id: string;
  content: string;
  memory_type: string;
  source: string;
  confidence: number;
  importance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface KnowledgeIngestResult {
  status: string;
  document_id: string;
  title: string;
}

export interface ResearchResultItem {
  title: string;
  url: string;
  domain: string;
  snippet: string;
  relevance_score?: number;
}

export interface ResearchPayload {
  query_text: string;
  results: ResearchResultItem[];
  total_results: number;
  execution_time_ms: number;
}

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("access_token") || "";
}

function getStoredUser(): any {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("growthos_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function sendNovaMessage(
  message: string,
  history: NovaChatMessage[] = []
): Promise<NovaChatResponse> {
  const user = getStoredUser();
  const userId = user?.id || user?.user_id || undefined;
  const userName = user?.name || user?.email?.split("@")[0] || "User";

  const payload = {
    user_id: userId,
    message,
    conversation_history: history.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    override_profile: {
      name: userName,
      user_id: userId || "anonymous_user",
    },
  };

  const res = await fetch(`${API_URL}/api/nova/chat`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `NOVA turn execution failed with status ${res.status}`);
  }

  return res.json();
}

export async function fetchNovaState(message?: string): Promise<Record<string, any>> {
  const user = getStoredUser();
  const userId = user?.id || user?.user_id || undefined;
  const userName = user?.name || user?.email?.split("@")[0] || "User";

  const payload = {
    user_id: userId,
    message: message || undefined,
    override_profile: {
      name: userName,
      user_id: userId || "anonymous_user",
    },
  };

  const res = await fetch(`${API_URL}/api/nova/build-state`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch NOVA state with status ${res.status}`);
  }

  return res.json();
}

export async function ingestKnowledge(
  title: string,
  contentText: string,
  source = "user_upload",
  visibility = "private_user"
): Promise<KnowledgeIngestResult> {
  const user = getStoredUser();
  const userId = user?.id || user?.user_id || undefined;

  const payload = {
    user_id: userId,
    title,
    content_text: contentText,
    source,
    visibility,
  };

  const res = await fetch(`${API_URL}/api/nova/knowledge/ingest`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Knowledge ingestion failed with status ${res.status}`);
  }

  return res.json();
}

export async function retrieveKnowledge(queryText: string, topK = 5): Promise<any> {
  const user = getStoredUser();
  const userId = user?.id || user?.user_id || undefined;

  const payload = {
    user_id: userId,
    query_text: queryText,
    top_k: topK,
    trigger_web_fallback: true,
  };

  const res = await fetch(`${API_URL}/api/nova/knowledge/retrieve`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Knowledge retrieval failed with status ${res.status}`);
  }

  return res.json();
}

export async function executeWebResearch(queryText: string, maxResults = 5): Promise<ResearchPayload> {
  const payload = {
    query_text: queryText,
    max_results: maxResults,
    fetch_content: true,
  };

  const res = await fetch(`${API_URL}/api/nova/research`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Web research failed with status ${res.status}`);
  }

  return res.json();
}

export async function fetchUserMemories(): Promise<MemoryRecord[]> {
  const user = getStoredUser();
  const userId = user?.id || user?.user_id || "anonymous_user";

  const res = await fetch(`${API_URL}/api/nova/memory/${userId}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    return [];
  }

  return res.json();
}

export async function createMemory(content: string, memoryType = "semantic", importance = 0.5): Promise<MemoryRecord> {
  const user = getStoredUser();
  const userId = user?.id || user?.user_id || "anonymous_user";

  const payload = {
    user_id: userId,
    content,
    memory_type: memoryType,
    source: "explicit_user",
    importance,
    metadata: { created_via: "nova_control_center" },
  };

  const res = await fetch(`${API_URL}/api/nova/memory`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Memory creation failed with status ${res.status}`);
  }

  return res.json();
}

export async function deleteMemory(memoryId: string, hardDelete = false): Promise<boolean> {
  const user = getStoredUser();
  const userId = user?.id || user?.user_id || "anonymous_user";

  const res = await fetch(`${API_URL}/api/nova/memory/${memoryId}?user_id=${userId}&hard_delete=${hardDelete}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  return res.ok;
}

