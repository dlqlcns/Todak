
import { GoogleGenAI, Type } from "@google/genai";
import { EmotionId, MoodRecord } from '../types';
import { EMOTIONS } from '../constants';

const apiKey = import.meta?.env?.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

// Follow the official Gemini client usage pattern. Only create the client when a key is present.
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

if (!ai) {
  console.warn('[Gemini] GEMINI_API_KEY가 설정되지 않아 로컬에서 AI 호출이 비활성화되었습니다. .env.local을 확인해주세요.');
}

const extractText = (response: { text?: (() => string) | string }): string => {
  const rawText = typeof response.text === 'function' ? response.text() : response.text;
  return rawText?.toString().trim() || '';
};


const buildEmpathyFallback = async (emotionIds: EmotionId[], userContent: string): Promise<string> => {
  // 1) Try asking the model again with a lightweight prompt so even fallback text is AI-written.
  if (ai) {
    const emotionLabels = emotionIds
      .map((id) => EMOTIONS.find((e) => e.id === id)?.label || id)
      .join(', ');

    const aiFallbackPrompt = `
      역할: 너는 "Todak". 편안하고 따뜻한 친구처럼 한국어 반말로 말해줘.
      감정 단서: ${emotionLabels || '없음'}
      일기 단서: ${userContent || '(비어 있음)'}

      조건:
      - 위 단서를 너 스스로 해석해서 2~3문장 공감 메시지를 만들어.
      - 템플릿을 채우지 말고, 읽은 느낌을 자연스럽게 풀어줘.
      - 조용히 감정을 인정하고, 짧은 응원이나 휴식 제안을 덧붙여.
    `;

    try {
      const aiResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: aiFallbackPrompt,
        config: { temperature: 0.75 },
      });

      const normalizedText = extractText(aiResponse);

      if (normalizedText) {
        return normalizedText;
      }
    } catch (fallbackError) {
      console.error('Fallback AI error:', fallbackError);
    }
  }

  // Non-AI fallback copy in case the Gemini API is unavailable.
  return "네 마음을 잘 들었어. 요즘 참 애썼겠구나. 잠깐 숨 고르듯 쉬어도 괜찮아, 내가 여기서 너를 응원하고 있어. 🌿";
};

/**
 * Generates an empathy message using Gemini API.
 */
export const generateEmpathyMessage = async (emotionIds: EmotionId[], userContent: string): Promise<string> => {
  try {
    if (!ai) {
      return buildEmpathyFallback(emotionIds, userContent);
    }

    const emotionLabels = emotionIds
      .map((id) => EMOTIONS.find((emo) => emo.id === id)?.label || id)
      .join(', ');

    const prompt = `
      역할: 너는 "Todak". 편안하고 따뜻하지만 상담사가 아닌 친구야.

      입력된 감정(사용자 선택): ${emotionLabels || '없음'}
      일기 내용: ${userContent || '(비어 있음)'}

      규칙:
      - 일기 텍스트와 감정을 너 스스로 해석해, 주어진 단어를 끼워 넣지 말 것.
      - 사용자가 적은 구체적인 내용이나 분위기를 1~2개라도 언급해서 맥락을 살릴 것.
      - 2~3문장, 부드러운 반말, 안전하고 따뜻한 어조. 필요하면 🌿, ✨ 같은 가벼운 이모지를 자연스럽게 사용.
      - 매번 새로운 표현을 사용하고, 템플릿처럼 보이는 문장은 피할 것.
      - 감정이 섞여 있으면 섞인 느낌을 친절히 짚어줘 (예: "기쁜데도 살짝 무거울 수 있지").
      - 조언은 가볍게, 위로와 공감에 초점을 둘 것.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });

    const text = extractText(response);

    return text || (await buildEmpathyFallback(emotionIds, userContent));
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

    const text = extractText(response);
    return JSON.parse(text as string);
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

        const text = extractText(response);
        return text || "이번 주는 다양한 감정들이 함께했네요. 힘든 날도 있었지만, 행복한 순간들도 빛났던 한 주였습니다. 다음 주도 당신의 속도대로 나아가길 응원해요! 🌈";
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

        const text = extractText(response);
        return text || "한 달 동안 정말 수고 많았어요. 다양한 감정의 파도 속에서도 자신을 잃지 않고 기록해준 당신이 멋져요. 다음 달도 당신의 색으로 가득 채워지길! ✨";
    } catch (error) {
        console.error("AI Service Error:", error);
        return "한 달 동안 정말 수고 많았어요. 다양한 감정의 파도 속에서도 자신을 잃지 않고 기록해준 당신이 멋져요. 다음 달도 당신의 색으로 가득 채워지길! ✨";
    }
}
