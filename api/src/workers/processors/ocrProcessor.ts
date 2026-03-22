import type { Job } from 'bullmq';
import { Document } from '../../models/Document';
import { Question } from '../../models/Question';
import { extractDocumentText } from '../../services/ocrService';
import { parseQuestionsFromText } from '../../services/questionParserService';
import { getAiSolveQueue } from '../../jobs/queues';
import type { JobPayload } from '../../jobs/queues';
import { getSequelize } from '../../models/index';

export async function processOcrJob(job: Job<JobPayload>): Promise<void> {
  const { documentId, tenantId } = job.data;

  const doc = await Document.findOne({ where: { id: documentId, tenantId } });
  if (!doc) {
    throw new Error(`Document ${documentId} not found for tenant ${tenantId}`);
  }

  await doc.update({ status: 'ocr_processing' });

  try {
    const ocr = await extractDocumentText({
      externalUrl: doc.externalUrl,
      mimeType: doc.mimeType,
      kind: doc.kind,
      localPath: doc.localPath,
    });

    await doc.update({ ocrText: ocr.text, status: 'parsing' });

    // Use Vision-extracted questions if available, otherwise parse from text
    const parsed = ocr.visionQuestions && ocr.visionQuestions.length > 0
      ? ocr.visionQuestions
      : await parseQuestionsFromText(ocr.text);

    const sequelize = getSequelize();
    const t = await sequelize.transaction();

    try {
      for (const q of parsed) {
        await Question.create(
          {
            tenantId,
            documentId,
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            confidenceScore: q.confidenceScore,
          },
          { transaction: t },
        );
      }
      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }

    await doc.update({ status: 'solving' });

    await getAiSolveQueue().add(
      'solve-document',
      { documentId, tenantId } satisfies JobPayload,
      { jobId: `solve-${documentId}` },
    );
  } catch (err) {
    await doc.update({ status: 'ocr_failed' });
    throw err;
  }
}
