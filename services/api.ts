import { EmotionId, MoodRecord, User } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface AuthResponse extends User {
  hasSeenGuide?: boolean;
}

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || res.statusText);
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
