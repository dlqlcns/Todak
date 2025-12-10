
export type EmotionId = 
  | 'angry' | 'worried' | 'happy' | 'calm' 
  | 'anxious' | 'sad' | 'surprised' | 'proud'
  | 'unpleasant' | 'shy' | 'regret' | 'depressed';

export interface Emotion {
  id: EmotionId;
  label: string;
  emoji: string;
  colorClass: string; // Tailwind class
  textColorClass: string;
}

export interface Recommendation {
  id: string;
  type: 'music' | 'video' | 'activity';
  title: string;
  desc: string;
  link?: string; // URL for external API/Page
}

export interface MoodRecord {
  id: number; // DB id
  date: string; // YYYY-MM-DD
  emotionIds: EmotionId[]; // Changed to array for multi-selection
  content: string;
  aiMessage?: string; // Persist the AI response
  recommendations?: Recommendation[]; // Persist recommendations
  timestamp: number;
}

export interface PeriodReview {
  content: string;
  periodStart: string;
  periodEnd: string;
  periodKey: string;
  lastMoodTimestamp: number;
  periodType: 'weekly' | 'monthly';
}

export interface User {
  id: number; // unique user id
  loginId: string;
  nickname: string;
  startDate: string; // ISO Date
}

export type ScreenName = 'home' | 'calendar' | 'report' | 'notification' | 'profile';
