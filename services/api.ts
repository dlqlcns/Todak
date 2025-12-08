import { EmotionId, MoodRecord, User } from "../types";

const DEFAULT_API_BASE = "https://todak-production-3b85.up.railway.app";
const API_BASE = (import.meta.env.VITE_API_URL || DEFAULT_API_BASE).replace(/\/$/, "");

interface AuthResponse extends User {
  hasSeenGuide?: boolean;
}

const parseErrorMessage = async (res: Response) => {
  // Try to preserve the backend's error detail (FastAPI uses "detail") before
  // falling back to generic status text so the UI can surface a meaningful message.
  let message = res.statusText || "요청을 처리할 수 없습니다.";

  try {
    const data = await res.clone().json();
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail) && data.detail[0]?.msg) return data.detail[0].msg;
    if (typeof data?.message === "string") return data.message;
  } catch (_) {
    // JSON parsing can fail for plain-text responses; ignore and try text next.
  }

  try {
    const text = await res.text();
    if (text) return text;
  } catch (_) {
    // Ignore text parsing issues and fall back to the status text.
  }

  return message;
};

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const detail = await parseErrorMessage(res);
    throw new Error(detail);
  }
  return res.json();
};

export const signup = async (id: string, password: string, nickname: string): Promise<AuthResponse> => {
  const res = await fetch(`${API_BASE}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, password, nickname }),
  });
  return handleResponse(res);
};

export const login = async (id: string, password: string): Promise<AuthResponse> => {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, password }),
  });
  return handleResponse(res);
};

export const fetchMoods = async (userId: string): Promise<MoodRecord[]> => {
  const res = await fetch(`${API_BASE}/users/${userId}/moods`);
  return handleResponse(res);
};

export const saveMood = async (
  userId: string,
  data: Omit<MoodRecord, "id"> & { id?: string }
): Promise<MoodRecord> => {
  const res = await fetch(`${API_BASE}/users/${userId}/moods`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: data.date,
      emotionIds: data.emotionIds as EmotionId[],
      content: data.content,
      aiMessage: data.aiMessage,
      recommendations: data.recommendations,
      timestamp: data.timestamp,
    }),
  });
  return handleResponse(res);
};

export const deleteMood = async (userId: string, moodId: number) => {
  const res = await fetch(`${API_BASE}/users/${userId}/moods/${moodId}`, {
    method: "DELETE",
  });
  return handleResponse(res);
};

export const markGuideSeen = async (userId: string): Promise<AuthResponse> => {
  const res = await fetch(`${API_BASE}/users/${userId}/guide`, {
    method: "PATCH",
  });
  return handleResponse(res);
};

export const deleteAccount = async (userId: string) => {
  const res = await fetch(`${API_BASE}/users/${userId}`, {
    method: "DELETE",
  });
  return handleResponse(res);
};
