
import { Emotion } from './types';

// Updated with Soft Pastel Palette and New Emojis
export const EMOTIONS: Emotion[] = [
  // Top 8
  { id: 'angry', label: '분노', emoji: '💢', colorClass: 'bg-[#FFAFA3]', textColorClass: 'text-[#8B4239]' }, // Soft Red
  { id: 'worried', label: '걱정', emoji: '💭', colorClass: 'bg-[#FFCCBC]', textColorClass: 'text-[#8D5545]' }, // Soft Orange
  { id: 'happy', label: '행복', emoji: '💛', colorClass: 'bg-[#FFF59D]', textColorClass: 'text-[#7F7030]' }, // Soft Yellow
  { id: 'calm', label: '평온', emoji: '🌿', colorClass: 'bg-[#C5E1A5]', textColorClass: 'text-[#50693B]' }, // Soft Green
  { id: 'anxious', label: '불안', emoji: '🌪️', colorClass: 'bg-[#80DEEA]', textColorClass: 'text-[#357A82]' }, // Soft Cyan
  { id: 'sad', label: '슬픔', emoji: '💧', colorClass: 'bg-[#90CAF9]', textColorClass: 'text-[#2D5D86]' }, // Soft Blue
  { id: 'surprised', label: '놀람', emoji: '💥', colorClass: 'bg-[#CE93D8]', textColorClass: 'text-[#6A3A75]' }, // Soft Purple
  { id: 'proud', label: '뿌듯', emoji: '🌟', colorClass: 'bg-[#FFCC80]', textColorClass: 'text-[#8F6325]' }, // Soft Amber
  // Expanded 4
  { id: 'unpleasant', label: '불쾌', emoji: '🌩️', colorClass: 'bg-[#A5D6A7]', textColorClass: 'text-[#3D6340]' }, // Green
  { id: 'shy', label: '부끄', emoji: '🌸', colorClass: 'bg-[#F48FB1]', textColorClass: 'text-[#883552]' }, // Pink
  { id: 'regret', label: '후회', emoji: '🕳️', colorClass: 'bg-[#BCAAA4]', textColorClass: 'text-[#5D4037]' }, // Brownish
  { id: 'depressed', label: '우울', emoji: '🖤', colorClass: 'bg-[#B0BEC5]', textColorClass: 'text-[#455A64]' }, // Blue Grey
];

export const AI_EMPATHY_MESSAGES: Record<string, string> = {
  default: "오늘 하루도 정말 애썼어. 네 마음이 어떤 색이든 난 언제나 네 곁에 있을게. 🌿",
  angry: "속상한 일이 있었구나. 화가 나는 건 당연한 감정이야. 잠시 눈을 감고 깊은 숨을 쉬어보는 건 어때? 🍃",
  happy: "와, 마음이 몽글몽글 행복하구나! ✨ 그 따뜻한 기운이 나에게도 전해지는 것 같아. 오늘을 꼭 기억해두자.",
  sad: "마음이 무겁구나... 비가 오면 잠시 쉬어가듯, 지금은 네 마음을 돌봐줄 시간이야. 내가 곁에 있어줄게. ☔️",
};
