
import { Emotion, Recommendation, EmotionId } from './types';

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

export const MOCK_RECOMMENDATIONS: Record<EmotionId, Recommendation[]> = {
  angry: [
    { id: '1', type: 'activity', title: '천천히 심호흡하기', desc: '4초 들이마시고, 7초 내뱉어봐요.' },
    { id: '2', type: 'music', title: '마음이 차분해지는 피아노', desc: '숲속에 온 듯한 편안한 선율' },
  ],
  happy: [
    { id: '3', type: 'activity', title: '오늘의 찰나 기록하기', desc: '이 예쁜 기분을 사진으로 남겨요.' },
    { id: '4', type: 'video', title: '산뜻한 어쿠스틱 플레이리스트', desc: '발걸음이 더 가벼워질 거예요.' },
  ],
  worried: [{ id: '5', type: 'activity', title: '걱정 인형에게 속삭이기', desc: '종이에 적어 구겨버려도 좋아요.' }],
  calm: [{ id: '6', type: 'activity', title: '따뜻한 차 한 잔의 여유', desc: '캐모마일 향기를 느껴보세요.' }],
  anxious: [{ id: '7', type: 'activity', title: '지금 내 주변 3가지 찾기', desc: '눈에 보이는 사물에 집중해봐요.' }],
  sad: [{ id: '8', type: 'music', title: '토닥토닥 위로의 노래', desc: '충분히 슬퍼해도 괜찮아요.' }],
  surprised: [{ id: '9', type: 'activity', title: '따뜻한 물 한 모금', desc: '놀란 마음을 천천히 가라앉혀요.' }],
  proud: [{ id: '10', type: 'activity', title: '스스로에게 칭찬해주기', desc: '거울을 보고 "정말 잘했어" 말해봐요.' }],
  unpleasant: [{ id: '11', type: 'activity', title: '창문 활짝 열어보기', desc: '신선한 공기로 기분을 환기해요.' }],
  shy: [{ id: '12', type: 'activity', title: '그럴 수도 있다고 말하기', desc: '누구나 겪는 감정인걸요.' }],
  regret: [{ id: '13', type: 'activity', title: '배움으로 바꾸기', desc: '다음엔 더 빛날 수 있을 거예요.' }],
  depressed: [{ id: '14', type: 'activity', title: '햇볕 아래 5분 걷기', desc: '따스한 빛이 도움이 될 거예요.' }],
};

export const AI_EMPATHY_MESSAGES: Record<string, string> = {
  default: "오늘 하루도 정말 애썼어. 네 마음이 어떤 색이든 난 언제나 네 곁에 있을게. 🌿",
  angry: "속상한 일이 있었구나. 화가 나는 건 당연한 감정이야. 잠시 눈을 감고 깊은 숨을 쉬어보는 건 어때? 🍃",
  happy: "와, 마음이 몽글몽글 행복하구나! ✨ 그 따뜻한 기운이 나에게도 전해지는 것 같아. 오늘을 꼭 기억해두자.",
  sad: "마음이 무겁구나... 비가 오면 잠시 쉬어가듯, 지금은 네 마음을 돌봐줄 시간이야. 내가 곁에 있어줄게. ☔️",
};
