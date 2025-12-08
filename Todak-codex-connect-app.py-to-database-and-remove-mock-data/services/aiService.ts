
import { GoogleGenAI, Type } from "@google/genai";
import { EmotionId, MoodRecord } from '../types';
import { AI_EMPATHY_MESSAGES, EMOTIONS } from '../constants';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

/**
 * Generates an empathy message using Gemini API.
 */
export const generateEmpathyMessage = async (emotionIds: EmotionId[], userContent: string): Promise<string> => {
  try {
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
        The user is feeling a mix of these emotions: "${emotionLabels}".
        User's journal content: "${userContent}".
        
        Act as "Todak", a gentle, warm, and cozy mental wellness friend. NOT a doctor or a counselor.
        Your tone should be:
        - Soft, safe, and non-clinical.
        - Friendly Korean Banmal (casual but respectful).
        - Use emojis like 🌿, ✨, ☁️ to create a calm atmosphere.
        
        Provide a short, comforting message (max 2-3 sentences).
        
        If the emotions are mixed (positive and negative), acknowledge the complexity ("It's okay to feel both happy and sad").
        If negative, offer a warm virtual hug.
        If positive, celebrate it softly.
      `,
      config: {
        temperature: 0.7,
      }
    });

    return response.text || AI_EMPATHY_MESSAGES[primaryEmotionId] || AI_EMPATHY_MESSAGES.default;
  } catch (error) {
    console.error("AI Service Error:", error);
    // Fallback
    const primaryEmotionId = emotionIds[0];
    return AI_EMPATHY_MESSAGES[primaryEmotionId] || AI_EMPATHY_MESSAGES.default;
  }
};

/**
 * Generates media recommendations (Music, Video) based on mood.
 */
export const generateMediaRecommendations = async (emotionLabels: string, userContent: string): Promise<{ music: { searchQuery: string, title: string, reason: string }, video: { searchQuery: string, title: string, reason: string } }> => {
  try {
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
