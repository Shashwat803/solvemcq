import type { Job } from 'bullmq';
import { Document } from '../models/Document';
import { Question } from '../models/Question';
import { Answer } from '../models/Answer';
import { getSequelize } from '../models/index';
import { getAiSolveQueue, getPdfQueue, type JobPayload } from '../jobs/queues';
import { extractDocumentText } from './ocrService';
import { parseQuestionsFromText } from './questionParserService';
import { solveMcq } from './aiSolvingService';
import { validateAnswerAgainstQuestion } from './validationService';

/**
 * OCR + parse + persist questions, then either enqueue AI job or continue inline.
 * @param continueInline - when true, runs AI solve + PDF in-process (no BullMQ chain).
 */
export async function runOcrStage(
  documentId: string,
  tenantId: string,
  continueInline: boolean,
): Promise<void> {
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

    if (continueInline) {
      await runAiSolveStage(documentId, tenantId, true);
    } else {
      const payload: JobPayload = { documentId, tenantId };
      await getAiSolveQueue().add('solve-document', payload, { jobId: `solve-${documentId}` });
    }
  } catch (err) {
    await doc.update({ status: 'ocr_failed' });
    throw err;
  }
}

export async function runAiSolveStage(
  documentId: string,
  tenantId: string,
  continueInline: boolean,
): Promise<void> {
  const doc = await Document.findOne({ where: { id: documentId, tenantId } });
  if (!doc) {
    throw new Error(`Document ${documentId} not found for tenant ${tenantId}`);
  }

  const questions = await Question.findAll({
    where: { tenantId, documentId },
    order: [['createdAt', 'ASC']],
  });

  try {
    for (const question of questions) {
      const existing = await Answer.findOne({
        where: { tenantId, questionId: question.id },
      });
      if (existing) continue;

      const solved = await solveMcq(question);
      const validation = validateAnswerAgainstQuestion(question, {
        selectedOption: solved.selectedOption,
      });

      await Answer.create({
        tenantId,
        questionId: question.id,
        selectedOption: solved.selectedOption,
        confidenceScore: solved.confidenceScore,
        explanation: solved.explanation,
        validated: validation.validated,
        validationNotes: validation.notes,
      });
    }
  } catch (err) {
    await doc.update({ status: 'failed' });
    throw err;
  }

  if (continueInline) {
    await runPdfStage(documentId, tenantId);
  } else {
    const payload: JobPayload = { documentId, tenantId };
    await getPdfQueue().add('generate-pdf', payload, { jobId: `pdf-${documentId}` });
  }
}

export async function runPdfStage(documentId: string, tenantId: string): Promise<void> {
  const doc = await Document.findOne({ where: { id: documentId, tenantId } });
  if (!doc) {
    throw new Error(`Document ${documentId} not found for tenant ${tenantId}`);
  }

  const syntheticUrl = `https://storage.placeholder/results/${tenantId}/${documentId}.pdf`;
  await doc.update({
    status: 'ready',
    pdfUrl: syntheticUrl,
    metadata: {
      ...(doc.metadata ?? {}),
      pdfGeneratedAt: new Date().toISOString(),
    },
  });
}

export async function processOcrJob(job: Job<JobPayload>): Promise<void> {
  const { documentId, tenantId } = job.data;
  await runOcrStage(documentId, tenantId, false);
}

export async function processAiSolveJob(job: Job<JobPayload>): Promise<void> {
  const { documentId, tenantId } = job.data;
  await runAiSolveStage(documentId, tenantId, false);
}

export async function processPdfJob(job: Job<JobPayload>): Promise<void> {
  const { documentId, tenantId } = job.data;
  await runPdfStage(documentId, tenantId);
}
