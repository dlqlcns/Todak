
import { GoogleGenAI, Type } from "@google/genai";
import { EmotionId, MoodRecord } from '../types';
import { EMOTIONS } from '../constants';

const apiKey = import.meta.env.VITE_GOOGLE_GENAI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const buildEmpathyFallback = (emotionIds: EmotionId[], userContent: string): string => {
  const primaryEmotionId = emotionIds[0];
  const primaryLabel = EMOTIONS.find((e) => e.id === primaryEmotionId)?.label || primaryEmotionId;
  const safeContent = userContent?.trim();
  const contentSnippet = safeContent ? `"${safeContent.slice(0, 80)}${safeContent.length > 80 ? '…' : ''}"` : '';

  const emotionBased = {
    angry: `지금 ${primaryLabel}로 마음이 뜨거운 것 같아. ${contentSnippet} 라고 적어준 마음이 느껴져. 잠깐 숨 고르며 마음을 쉬어가보자.`,
    worried: `${contentSnippet || '적어준'} 이야기를 읽으니 걱정이 많이 되는 하루였겠다. 내가 옆에서 살짝 어깨를 토닥여줄게.`,
    happy: `${contentSnippet || '적어준'} 순간들이 너를 미소 짓게 했구나. 그 따뜻함을 조금 더 오래 붙잡아보자. ✨`,
    sad: `${contentSnippet || '적어준'} 마음이 많이 무겁겠어. 조용히 옆에 앉아 있을게, 잠시라도 숨을 고르며 쉬어가자.`,
    anxious: `${contentSnippet || '적어준'} 생각들 때문에 마음이 조급했을 것 같아. 천천히 숨을 들이쉬고 내쉬면서 내가 옆에 있음을 느껴줘.`,
  } as Record<string, string>;

  return (
    emotionBased[primaryEmotionId] ||
    `${contentSnippet || '적어준 일기'}를 읽었어. ${primaryLabel ? `${primaryLabel}한 감정이 느껴졌어.` : ''} 어떤 색이든 너의 마음을 존중해. 함께 천천히 풀어가보자. 🌿`
  );
};

/**
 * Generates an empathy message using Gemini API.
 */
export const generateEmpathyMessage = async (emotionIds: EmotionId[], userContent: string): Promise<string> => {
  try {
    if (!ai) {
      return buildEmpathyFallback(emotionIds, userContent);
    }

    // Get all emotion labels
    const emotionLabels = emotionIds.map(id => {
        const e = EMOTIONS.find(emo => emo.id === id);
        return e ? e.label : id;
    }).join(', ');

    // Use the first emotion for fallback logic if needed
    const primaryEmotionId = emotionIds[0];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        You are "Todak", a gentle, warm, and cozy mental wellness friend (NOT a doctor or counselor).

        INPUT EMOTIONS (user-selected labels): "${emotionLabels}".
        INPUT DIARY TEXT: "${userContent}".

        Read the diary text and infer the user's emotional nuance yourself (do NOT just swap in the given labels). Blend your own reading of the text with the provided emotions to craft a unique, contextual response.

        Tone:
        - Friendly Korean Banmal (casual but respectful)
        - Soft, safe, non-clinical; include gentle emojis like 🌿, ✨, ☁️ when they fit naturally.

        Reply constraints:
        - 2-3 sentences max, concise but heartfelt.
        - Reflect specific details or mood shifts you notice in the diary entry.
        - Avoid repeating a stock phrase; each reply should feel freshly written for the entry.
        - If emotions conflict, name the mix kindly (e.g., "기쁜데도 마음이 살짝 무거울 수 있지"). If pain is present, offer warm validation; if joy is present, celebrate softly.
      `,
      config: {
        temperature: 0.7,
      }
    });

    return response.text || buildEmpathyFallback(emotionIds, userContent);
  } catch (error) {
    console.error("AI Service Error:", error);
    // Fallback
    return buildEmpathyFallback(emotionIds, userContent);
  }
};

/**
 * Generates media recommendations (Music, Video) based on mood.
 */
export const generateMediaRecommendations = async (emotionLabels: string, userContent: string): Promise<{ music: { searchQuery: string, title: string, reason: string }, video: { searchQuery: string, title: string, reason: string } }> => {
  try {
    if (!ai) {
      return {
        music: { searchQuery: "healing piano music", title: "잔잔한 피아노 음악", reason: "마음을 편안하게 해줄 거예요." },
        video: { searchQuery: "nature sounds relaxing", title: "자연의 소리", reason: "잠시 숲속으로 떠나보세요." }
      };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        The user is feeling: "${emotionLabels}".
        Journal content: "${userContent}".

        Recommend:
        1. ONE specific song available on Spotify that matches this mood.
        2. ONE specific YouTube video topic (e.g., ASMR, motivational speech, specific music playlist style) that helps.

        Output JSON format.
        Language: Korean.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            music: {
              type: Type.OBJECT,
              properties: {
                searchQuery: { type: Type.STRING, description: "Artist and Song Title for Spotify search query" },
                title: { type: Type.STRING, description: "Display title (Song - Artist)" },
                reason: { type: Type.STRING, description: "Short, warm reason why this fits (1 sentence)" },
              },
              required: ["searchQuery", "title", "reason"],
            },
            video: {
              type: Type.OBJECT,
              properties: {
                searchQuery: { type: Type.STRING, description: "Keywords for YouTube search query" },
                title: { type: Type.STRING, description: "Display title" },
                reason: { type: Type.STRING, description: "Short, warm reason why this fits (1 sentence)" },
              },
              required: ["searchQuery", "title", "reason"],
            },
          },
          required: ["music", "video"],
        },
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Recommendation Error:", error);
    return {
      music: { searchQuery: "healing piano music", title: "잔잔한 피아노 음악", reason: "마음을 편안하게 해줄 거예요." },
      video: { searchQuery: "nature sounds relaxing", title: "자연의 소리", reason: "잠시 숲속으로 떠나보세요." }
    };
  }
};

export const generateWeeklyReview = async (moods: MoodRecord[]): Promise<string> => {
    try {
        if (!ai) {
            return moods && moods.length > 0
                ? "이번 주는 다양한 감정들이 함께했네요. 힘든 날도 있었지만, 행복한 순간들도 빛났던 한 주였습니다. 다음 주도 당신의 속도대로 나아가길 응원해요! 🌈"
                : "이번 주는 아직 기록이 부족해요. 당신의 작은 감정들도 소중하니 다음 주에는 꼭 들려주세요. 😊";
        }

        if (!moods || moods.length === 0) {
            return "이번 주는 아직 기록이 부족해요. 당신의 작은 감정들도 소중하니 다음 주에는 꼭 들려주세요. 😊";
        }

        const prompt = `
          Act as "Todak", a warm mental wellness AI friend.
          Analyze the following mood journal entries for the week and write a gentle, encouraging weekly review in Korean (Banmal).
          
          Focus on the flow of emotions. Highlight positive moments and offer warm comfort for sad ones.
          Keep it under 3-4 sentences. Use a soft, poetic tone.
          Do not analyze like a machine, speak like a caring friend.

          Entries:
          ${moods.map(m => `- ${m.date}: ${m.emotionIds.join(', ')} (${m.content})`).join('\n')}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.7,
            }
        });

        return response.text || "이번 주는 다양한 감정들이 함께했네요. 힘든 날도 있었지만, 행복한 순간들도 빛났던 한 주였습니다. 다음 주도 당신의 속도대로 나아가길 응원해요! 🌈";
    } catch (error) {
        console.error("AI Service Error:", error);
        return "이번 주는 다양한 감정들이 함께했네요. 힘든 날도 있었지만, 행복한 순간들도 빛났던 한 주였습니다. 다음 주도 당신의 속도대로 나아가길 응원해요! 🌈";
    }
}

export const generateMonthlyReview = async (moods: MoodRecord[]): Promise<string> => {
    try {
        if (!ai) {
            return moods && moods.length > 0
                ? "한 달 동안 정말 수고 많았어요. 다양한 감정의 파도 속에서도 자신을 잃지 않고 기록해준 당신이 멋져요. 다음 달도 당신의 색으로 가득 채워지길! ✨"
                : "이번 달은 아직 기록이 충분하지 않아요. 하루하루 쌓이는 마음들이 당신을 더 단단하게 만들어줄 거예요. 🌙";
        }

        if (!moods || moods.length === 0) {
            return "이번 달은 아직 기록이 충분하지 않아요. 하루하루 쌓이는 마음들이 당신을 더 단단하게 만들어줄 거예요. 🌙";
        }

        const prompt = `
          Act as "Todak", a warm mental wellness AI friend.
          Analyze the following mood journal entries for the entire MONTH and write a gentle, insightful monthly review in Korean (Banmal).
          
          Look for overall patterns or changes in mood over the month.
          Acknowledge their effort in recording their days.
          Keep it under 3-5 sentences. Use a warm, reflective tone.

          Entries:
          ${moods.map(m => `- ${m.date}: ${m.emotionIds.join(', ')} (${m.content})`).join('\n')}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.7,
            }
        });

        return response.text || "한 달 동안 정말 수고 많았어요. 다양한 감정의 파도 속에서도 자신을 잃지 않고 기록해준 당신이 멋져요. 다음 달도 당신의 색으로 가득 채워지길! ✨";
    } catch (error) {
        console.error("AI Service Error:", error);
        return "한 달 동안 정말 수고 많았어요. 다양한 감정의 파도 속에서도 자신을 잃지 않고 기록해준 당신이 멋져요. 다음 달도 당신의 색으로 가득 채워지길! ✨";
    }
}
