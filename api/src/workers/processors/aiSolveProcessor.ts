import type { Job } from 'bullmq';
import { Document } from '../../models/Document';
import { Question } from '../../models/Question';
import { Answer } from '../../models/Answer';
import { solveMcq } from '../../services/aiSolvingService';
import { validateAnswerAgainstQuestion } from '../../services/validationService';
import { getPdfQueue } from '../../jobs/queues';
import type { JobPayload } from '../../jobs/queues';

export async function processAiSolveJob(job: Job<JobPayload>): Promise<void> {
  const { documentId, tenantId } = job.data;

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

  await getPdfQueue().add(
    'generate-pdf',
    { documentId, tenantId } satisfies JobPayload,
    { jobId: `pdf-${documentId}` },
  );
}
