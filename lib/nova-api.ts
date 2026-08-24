// lib/nova-api.ts
// Client API for NOVA Advanced Intelligence Engine (Steps 1 - 11).

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

export async function sendNovaMessage(
  message: string,
  history: NovaChatMessage[] = []
): Promise<NovaChatResponse> {
  const token = getToken();
  const user = getStoredUser();
  const userId = user?.id || user?.user_id || undefined;
  const userName = user?.name || user?.email?.split("@")[0] || "User";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

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
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `NOVA turn execution failed with status ${res.status}`);
  }

  return res.json();
}
