import { EmotionId, MoodRecord, Recommendation, User } from '../types';

type RequestInitWithBody = RequestInit & { body?: string };

const getApiBase = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_API_BASE_URL || '';
  }
  return process.env.API_BASE_URL || '';
};

const API_BASE = getApiBase();

const buildOptions = (init?: RequestInit): RequestInitWithBody => ({
  headers: {
    'Content-Type': 'application/json',
    ...(init?.headers || {}),
  },
  ...init,
});

const handleResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;

  if (!response.ok) {
    const message = typeof data === 'string' ? data : (data as any)?.error || '요청을 처리하지 못했어요.';
    throw new Error(message);
  }

  return data as T;
};

export interface MoodPayload {
  date: string;
  emotionIds: EmotionId[];
  content: string;
  aiMessage?: string;
  recommendations?: Recommendation[];
  timestamp: number;
}

export const registerUser = async (loginId: string, password: string, nickname: string): Promise<User> => {
  const res = await fetch(`${API_BASE}/api/signup`, buildOptions({
    method: 'POST',
    body: JSON.stringify({ loginId, password, nickname })
  }));

  return handleResponse<User>(res);
};

export const loginUser = async (loginId: string, password: string): Promise<User> => {
  const res = await fetch(`${API_BASE}/api/login`, buildOptions({
    method: 'POST',
    body: JSON.stringify({ loginId, password })
  }));

  return handleResponse<User>(res);
};

export const fetchUserMoods = async (userId: number): Promise<MoodRecord[]> => {
  const res = await fetch(`${API_BASE}/api/users/${userId}/moods`, buildOptions({ method: 'GET' }));
  return handleResponse<{ records: MoodRecord[] }>(res).then(data => data.records);
};

export const saveUserMood = async (userId: number, payload: MoodPayload): Promise<MoodRecord> => {
  const res = await fetch(`${API_BASE}/api/users/${userId}/moods`, buildOptions({
    method: 'POST',
    body: JSON.stringify(payload)
  }));

  return handleResponse<MoodRecord>(res);
};

export const deleteUserMood = async (userId: number, recordDate: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/api/users/${userId}/moods/${recordDate}`, buildOptions({ method: 'DELETE' }));
  await handleResponse<{ success: boolean }>(res);
};

export const deleteUserAccount = async (userId: number): Promise<void> => {
  const res = await fetch(`${API_BASE}/api/users/${userId}`, buildOptions({ method: 'DELETE' }));
  await handleResponse<{ success: boolean }>(res);
};
