import { Worker } from 'bullmq';
import { env } from '../config/env';
import { getBullConnection } from '../jobs/connection';
import { QUEUE_NAMES } from '../jobs/queues';
import { getSequelize, initModels } from '../models/index';
import { processOcrJob } from './processors/ocrProcessor';
import { processAiSolveJob } from './processors/aiSolveProcessor';
import { processPdfJob } from './processors/pdfProcessor';

async function main() {
  const e = env();
  if (e.REDIS_DISABLED) {
    console.error('Worker requires Redis. Unset REDIS_DISABLED and set REDIS_URL.');
    process.exit(1);
  }

  const sequelize = getSequelize();
  initModels(sequelize);
  await sequelize.authenticate();

  const connection = getBullConnection();

  const ocrWorker = new Worker(QUEUE_NAMES.OCR, processOcrJob, { connection, concurrency: 2 });
  const aiWorker = new Worker(QUEUE_NAMES.AI_SOLVE, processAiSolveJob, { connection, concurrency: 2 });
  const pdfWorker = new Worker(QUEUE_NAMES.PDF, processPdfJob, { connection, concurrency: 2 });

  for (const w of [ocrWorker, aiWorker, pdfWorker]) {
    w.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed`, err);
    });
  }

  console.log('BullMQ workers listening', {
    queues: [QUEUE_NAMES.OCR, QUEUE_NAMES.AI_SOLVE, QUEUE_NAMES.PDF],
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
