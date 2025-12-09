import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readGeminiKey() {
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }

  const envPath = path.resolve(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
    const match = lines.find((line) => line.trim().startsWith('GEMINI_API_KEY='));
    if (match) {
      return match.split('=')[1]?.trim().replace(/^['"]|['"]$/g, '');
    }
  }

  return undefined;
}

async function run() {
  const apiKey = readGeminiKey();

  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY가 설정되지 않았습니다. .env.local 또는 환경 변수를 확인해주세요.');
    process.exit(1);
  }

  const client = new GoogleGenAI({ apiKey });

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Say hello in Korean with a friendly emoji.',
      config: { temperature: 0.5 }
    });

    const text = response.text();
    console.log('✅ Gemini 응답 예시:\n', text?.trim());
  } catch (error) {
    console.error('❌ Gemini API 호출 실패:', error);
    process.exitCode = 1;
  }
}

run();
