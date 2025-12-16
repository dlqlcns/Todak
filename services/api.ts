import { EmotionId, MoodRecord, User, Recommendation, PeriodReview } from '../types';

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

export async function fetchReminder(userId: number): Promise<string | null> {
  const { reminderTime } = await request<{ reminderTime: string | null }>(`/api/reminder?userId=${userId}`);
  return reminderTime;
}

export async function saveReminder(userId: number, reminderTime: string): Promise<string> {
  const { reminderTime: savedTime } = await request<{ reminderTime: string }>('/api/reminder', {
    method: 'POST',
    body: JSON.stringify({ userId, reminderTime }),
  });
  return savedTime;
}

export async function checkIdAvailability(loginId: string): Promise<boolean> {
  const { available } = await request<{ available: boolean }>(`/api/check-id?loginId=${encodeURIComponent(loginId)}`);
  return available;
}

export async function fetchPeriodReview(
  userId: number,
  periodType: 'weekly' | 'monthly',
  periodKey: string,
  periodStart: string,
  periodEnd: string,
): Promise<PeriodReview | null> {
  const { review } = await request<{ review: PeriodReview | null }>(
    `/api/reviews?userId=${userId}&periodType=${periodType}&periodKey=${encodeURIComponent(periodKey)}&periodStart=${encodeURIComponent(periodStart)}&periodEnd=${encodeURIComponent(periodEnd)}`,
  );
  return review;
}

export async function savePeriodReview(
  userId: number,
  periodType: 'weekly' | 'monthly',
  periodKey: string,
  content: string,
  lastMoodTimestamp: number,
  periodStart: string,
  periodEnd: string,
): Promise<PeriodReview> {
  const { review } = await request<{ review: PeriodReview }>('/api/reviews', {
    method: 'POST',
    body: JSON.stringify({ userId, periodType, periodKey, content, lastMoodTimestamp, periodStart, periodEnd }),
  });
  return review;
}

export async function deleteAccount(userId: number): Promise<void> {
  await request<void>(`/api/users/${userId}`, { method: 'DELETE' });
}
