import { EmotionId, MoodRecord, User, Recommendation } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}) as Record<string, string>,
    },
    ...options,
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || '요청 처리 중 문제가 발생했어요.');
  }

  return res.json() as Promise<T>;
}

export async function signup(loginId: string, password: string, nickname: string): Promise<User> {
  return request<User>('/api/signup', {
    method: 'POST',
    body: JSON.stringify({ loginId, password, nickname }),
  });
}

export async function login(loginId: string, password: string): Promise<User> {
  return request<User>('/api/login', {
    method: 'POST',
    body: JSON.stringify({ loginId, password }),
  });
}

export async function fetchMoods(userId: number): Promise<Record<string, MoodRecord>> {
  const records = await request<MoodRecord[]>(`/api/moods?userId=${userId}`);
  return records.reduce<Record<string, MoodRecord>>((acc, record) => {
    acc[record.date] = record;
    return acc;
  }, {});
}

export async function saveMood(
  userId: number,
  date: string,
  emotionIds: EmotionId[],
  content: string,
  aiMessage?: string,
  recommendations?: Recommendation[],
): Promise<MoodRecord> {
  return request<MoodRecord>('/api/moods', {
    method: 'POST',
    body: JSON.stringify({ userId, date, emotionIds, content, aiMessage, recommendations }),
  });
}

export async function deleteMood(recordId: number): Promise<void> {
  await request<void>(`/api/moods/${recordId}`, { method: 'DELETE' });
}
