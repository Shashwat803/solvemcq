import { getOpenAI, getOpenAIModel } from '../ai/openaiClient';
import type { Question } from '../models/Question';
import type { McqLetter } from '../models/Answer';

export type SolveResult = {
  selectedOption: McqLetter;
  confidenceScore: number;
  explanation: string | null;
};

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

export async function solveMcq(question: Question): Promise<SolveResult> {
  const client = getOpenAI();
  const opts = question.options as Record<string, string>;

  if (!client) {
    return {
      selectedOption: 'B',
      confidenceScore: 0.42,
      explanation: 'OpenAI not configured; placeholder selection.',
    };
  }

  const completion = await client.chat.completions.create({
    model: getOpenAIModel(),
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You solve multiple-choice questions. Reply JSON only: { "selectedOption": "A"|"B"|"C"|"D", "confidenceScore": number 0-1, "explanation": string }',
      },
      {
        role: 'user',
        content: `Question: ${question.text}\nA) ${opts.A}\nB) ${opts.B}\nC) ${opts.C}\nD) ${opts.D}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    return { selectedOption: 'A', confidenceScore: 0.35, explanation: 'Empty model response.' };
  }

  try {
    const parsed = JSON.parse(raw) as {
      selectedOption?: string;
      confidenceScore?: number;
      explanation?: string;
    };
    const letter = (parsed.selectedOption?.toUpperCase() ?? 'A') as McqLetter;
    if (!['A', 'B', 'C', 'D'].includes(letter)) {
      return { selectedOption: 'A', confidenceScore: 0.4, explanation: parsed.explanation ?? null };
    }
    return {
      selectedOption: letter,
      confidenceScore: clamp01(parsed.confidenceScore ?? 0.7),
      explanation: parsed.explanation ?? null,
    };
  } catch {
    return { selectedOption: 'A', confidenceScore: 0.35, explanation: 'Failed to parse model JSON.' };
  }
}
