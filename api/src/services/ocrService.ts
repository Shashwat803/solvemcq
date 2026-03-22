import { PDFParse } from 'pdf-parse';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getOpenAI, getOpenAIModel } from '../ai/openaiClient';
import type { ParsedQuestion } from './questionParserService';

export type OcrResult = {
  text: string;
  confidence: number;
  /** When Vision-based OCR is used, questions are extracted directly from page images. */
  visionQuestions?: ParsedQuestion[];
};

const MAX_BYTES = 40 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 120_000;

/**
 * Blocks obvious SSRF targets when the worker fetches tenant-supplied URLs.
 */
function assertUrlAllowed(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error('Invalid document URL');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Only http(s) document URLs are supported');
  }
  const host = u.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '127.0.0.1' ||
    host === '[::1]' ||
    host.endsWith('.localhost')
  ) {
    throw new Error('Local and loopback URLs are not allowed for document fetch');
  }
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
    throw new Error('Private network URLs are not allowed for document fetch');
  }
  return u;
}

async function fetchPdfBuffer(url: string): Promise<Buffer> {
  assertUrlAllowed(url);
  const res = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { 'User-Agent': 'SolveMCQ-OCR/1.0' },
  });
  if (!res.ok) {
    throw new Error(`Failed to download PDF (${res.status} ${res.statusText})`);
  }
  const len = res.headers.get('content-length');
  if (len && Number(len) > MAX_BYTES) {
    throw new Error('PDF exceeds maximum allowed size');
  }
  const arrayBuffer = await res.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_BYTES) {
    throw new Error('PDF exceeds maximum allowed size');
  }
  return Buffer.from(arrayBuffer);
}

async function readLocalPdfBuffer(localPath: string): Promise<Buffer> {
  const resolved = path.resolve(localPath);
  const stat = await fs.stat(resolved);
  if (stat.size > MAX_BYTES) {
    throw new Error('PDF exceeds maximum allowed size');
  }
  return fs.readFile(resolved);
}

/**
 * Converts a scanned/image-only PDF to page images using pdf-to-img,
 * then sends each page to OpenAI Vision to extract MCQs.
 */
async function extractQuestionsViaVision(pdfBuffer: Buffer): Promise<{ text: string; questions: ParsedQuestion[] }> {
  const client = getOpenAI();
  if (!client) {
    return { text: '[Vision] OpenAI not configured — cannot OCR scanned PDF.', questions: [] };
  }

  const { pdf } = await import('pdf-to-img');
  const pages: Buffer[] = [];
  const doc = await pdf(pdfBuffer, { scale: 1.5 });
  for await (const page of doc) {
    pages.push(Buffer.from(page));
  }

  console.log(`[ocr] Scanned PDF: ${pages.length} pages, sending to Vision API...`);

  const allQuestions: ParsedQuestion[] = [];
  const textParts: string[] = [];

  // Process pages in batches of 4 to avoid overwhelming the API
  const BATCH_SIZE = 4;
  for (let i = 0; i < pages.length; i += BATCH_SIZE) {
    const batch = pages.slice(i, i + BATCH_SIZE);
    const imageContent = batch.map((buf) => ({
      type: 'image_url' as const,
      image_url: { url: `data:image/png;base64,${buf.toString('base64')}` },
    }));

    const pageRange = `${i + 1}-${Math.min(i + BATCH_SIZE, pages.length)}`;
    console.log(`[ocr] Processing pages ${pageRange}/${pages.length}...`);

    const completion = await client.chat.completions.create({
      model: getOpenAIModel(),
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You extract MCQs from exam page images. Return JSON: { "questions": [ { "text": string (the full question text), "options": { "A": string, "B": string, "C": string, "D": string }, "correctAnswer": "A"|"B"|"C"|"D"|null, "explanation": string|null, "confidenceScore": number 0-1 } ] }. Include all visible options exactly as shown. If a page has no MCQs (e.g. title page, instructions), return { "questions": [] }.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Extract all MCQs from these exam pages (${pageRange}).` },
            ...imageContent,
          ],
        },
      ],
      max_tokens: 8000,
    });

    const raw = completion.choices[0]?.message?.content;
    if (raw) {
      textParts.push(raw);
      try {
        const parsed = JSON.parse(raw) as { questions?: ParsedQuestion[] };
        if (Array.isArray(parsed.questions)) {
          allQuestions.push(...parsed.questions.map(normalizeVisionQuestion));
        }
      } catch {
        console.warn(`[ocr] Failed to parse Vision response for pages ${pageRange}`);
      }
    }
  }

  console.log(`[ocr] Vision extraction complete: ${allQuestions.length} questions from ${pages.length} pages`);

  return {
    text: `[Vision OCR] Extracted ${allQuestions.length} questions from ${pages.length} scanned pages.`,
    questions: allQuestions,
  };
}

function normalizeVisionQuestion(q: ParsedQuestion): ParsedQuestion {
  return {
    text: q.text ?? '',
    options: {
      A: q.options?.A ?? '',
      B: q.options?.B ?? '',
      C: q.options?.C ?? '',
      D: q.options?.D ?? '',
    },
    correctAnswer: q.correctAnswer ?? null,
    explanation: q.explanation ?? null,
    confidenceScore: typeof q.confidenceScore === 'number' ? Math.min(1, Math.max(0, q.confidenceScore)) : 0.8,
  };
}

/**
 * Pulls text from the document.
 * - PDF with text layer: extracts text via pdf-parse.
 * - Scanned PDF (no text): uses Vision API to extract questions directly from page images.
 * - Image: returns a marker (future: Vision OCR).
 */
export async function extractDocumentText(params: {
  externalUrl: string;
  mimeType: string;
  kind: 'pdf' | 'image';
  localPath?: string | null;
}): Promise<OcrResult> {
  const isPdf = params.kind === 'pdf' || params.mimeType.toLowerCase().includes('pdf');

  if (isPdf) {
    try {
      const buffer = params.localPath
        ? await readLocalPdfBuffer(params.localPath)
        : await fetchPdfBuffer(params.externalUrl);

      // First try text extraction
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      let text = '';
      try {
        const result = await parser.getText();
        text = (result.text ?? '').trim();
      } finally {
        await parser.destroy();
      }

      // Check if text is meaningful (not just page markers like "-- 1 of 32 --")
      const meaningful = text.replace(/--\s*\d+\s*of\s*\d+\s*--/g, '').trim();
      if (meaningful.length > 100) {
        return { text: meaningful, confidence: 0.88 };
      }

      // Scanned PDF: Fall back to Vision OCR
      console.log('[ocr] PDF has no meaningful text layer, falling back to Vision OCR...');
      const vision = await extractQuestionsViaVision(buffer);
      return {
        text: vision.text,
        confidence: 0.85,
        visionQuestions: vision.questions,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'PDF extraction failed';
      throw new Error(`PDF extraction: ${msg}`);
    }
  }

  return {
    text:
      '[Image] OCR/vision is not enabled. Integrate OpenAI Vision, Google Vision, or Textract to read image question papers. ' +
      `Source: ${params.externalUrl} (${params.mimeType})`,
    confidence: 0.1,
  };
}

/** @deprecated Use {@link extractDocumentText}. Kept for tests / emergency fallback only. */
export async function runOcrPlaceholder(params: {
  externalUrl: string;
  mimeType: string;
  kind: 'pdf' | 'image';
}): Promise<OcrResult> {
  const snippet = `[OCR placeholder] Document from ${params.kind} (${params.mimeType}). Source: ${params.externalUrl}\n\nSample extracted text for parsing pipeline. Question 1: What is 2+2? A) 3 B) 4 C) 5 D) 6`;
  return {
    text: snippet,
    confidence: 0.92,
  };
}
