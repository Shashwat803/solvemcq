import type { Request, Response } from 'express';
import { documentIdParam } from '../validators/schemas';
import * as documentService from '../services/documentService';
import { asyncHandler } from '../utils/asyncHandler';
import type { Question } from '../models/Question';
import type { Answer } from '../models/Answer';

export const getResults = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  if (!tenantId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const params = documentIdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'Invalid document id' });
    return;
  }

  const { document, questions } = await documentService.getResultsForDocument(
    tenantId,
    params.data.documentId,
  );

  res.json({
    document: {
      id: document.id,
      title: document.title,
      status: document.status,
      kind: document.kind,
      mimeType: document.mimeType,
      externalUrl: document.externalUrl,
      pdfUrl: document.pdfUrl,
      ocrText: document.ocrText,
      metadata: document.metadata,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    },
    questions: questions.map((q) => {
      const row = q as Question & { answers?: Answer[] };
      return {
        id: row.id,
        text: row.text,
        options: row.options,
        correctAnswer: row.correctAnswer,
        explanation: row.explanation,
        confidenceScore: row.confidenceScore,
        aiAnswer: row.answers?.[0]
          ? {
              id: row.answers[0].id,
              selectedOption: row.answers[0].selectedOption,
              confidenceScore: row.answers[0].confidenceScore,
              explanation: row.answers[0].explanation,
              validated: row.answers[0].validated,
              validationNotes: row.answers[0].validationNotes,
            }
          : null,
      };
    }),
  });
});
