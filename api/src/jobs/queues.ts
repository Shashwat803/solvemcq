import { Queue } from 'bullmq';
import { env } from '../config/env';
import { getBullConnection } from './connection';

export const QUEUE_NAMES = {
  OCR: 'ocr-processing',
  AI_SOLVE: 'ai-solving',
  PDF: 'pdf-generation',
} as const;

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 200 },
};

type QueueBundle = {
  ocr: Queue;
  aiSolve: Queue;
  pdf: Queue;
};

let queues: QueueBundle | null = null;

function getQueues(): QueueBundle {
  if (env().REDIS_DISABLED) {
    throw new Error('Queues are unavailable when REDIS_DISABLED=true');
  }
  if (!queues) {
    const connection = getBullConnection();
    const opts = { connection, defaultJobOptions };
    queues = {
      ocr: new Queue(QUEUE_NAMES.OCR, opts),
      aiSolve: new Queue(QUEUE_NAMES.AI_SOLVE, opts),
      pdf: new Queue(QUEUE_NAMES.PDF, opts),
    };
  }
  return queues;
}

export function getOcrQueue(): Queue {
  return getQueues().ocr;
}

export function getAiSolveQueue(): Queue {
  return getQueues().aiSolve;
}

export function getPdfQueue(): Queue {
  return getQueues().pdf;
}

export type JobPayload = {
  documentId: string;
  tenantId: string;
};
