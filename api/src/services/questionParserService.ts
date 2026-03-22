import { getOpenAI, getOpenAIModel } from '../ai/openaiClient';
import type { McqOptions } from '../models/Question';

export type ParsedQuestion = {
  text: string;
  options: McqOptions;
  correctAnswer: 'A' | 'B' | 'C' | 'D' | null;
  explanation: string | null;
  confidenceScore: number;
};

export async function parseQuestionsFromText(ocrText: string): Promise<ParsedQuestion[]> {
  const t = ocrText.trim();
  if (!t) return [];
  if (t.startsWith('[Image] OCR/vision')) return [];
  if (t.startsWith('[PDF] No text layer')) return [];

  const client = getOpenAI();
  if (!client) {
    return heuristicParse(t);
  }

  const completion = await client.chat.completions.create({
    model: getOpenAIModel(),
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You extract MCQs from exam OCR text. Return JSON: { "questions": [ { "text": string, "options": { "A","B","C","D": string }, "correctAnswer": "A"|"B"|"C"|"D"|null, "explanation": string|null, "confidenceScore": number between 0 and 1 } ] }. If none found, return { "questions": [] }.',
      },
      { role: 'user', content: t.slice(0, 30000) },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return heuristicParse(t);

  try {
    const parsed = JSON.parse(raw) as { questions?: ParsedQuestion[] };
    const list = parsed.questions ?? [];
    if (!Array.isArray(list) || list.length === 0) return heuristicParse(t);
    return list.map(normalizeQuestion);
  } catch {
    return heuristicParse(t);
  }
}

function normalizeQuestion(q: ParsedQuestion): ParsedQuestion {
  return {
    text: q.text,
    options: {
      A: q.options?.A ?? '',
      B: q.options?.B ?? '',
      C: q.options?.C ?? '',
      D: q.options?.D ?? '',
    },
    correctAnswer: q.correctAnswer ?? null,
    explanation: q.explanation ?? null,
    confidenceScore: clamp01(q.confidenceScore ?? 0.7),
  };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

function heuristicParse(text: string): ParsedQuestion[] {
  if (text.length < 20) return [];
  // Without OpenAI, do not invent MCQs from arbitrary PDF text (avoids fake "2+2" style output).
  return [];
}
