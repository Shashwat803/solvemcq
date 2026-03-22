import type { Request, Response } from 'express';
import { uuidParam } from '../validators/schemas';
import * as documentService from '../services/documentService';
import { asyncHandler } from '../utils/asyncHandler';
import type { Question } from '../models/Question';
import type { Answer } from '../models/Answer';
import { runOcrStage } from '../services/documentPipeline';

export const uploadDocument = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  if (!tenantId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const file = req.file as Express.Multer.File | undefined;
  const title = (req.body.title as string) || file?.originalname || 'Untitled';
  const mimeType = (req.body.mimeType as string) || file?.mimetype || 'application/pdf';
  const kind = (req.body.kind as 'pdf' | 'image') || (mimeType.includes('pdf') ? 'pdf' : 'image');
  const externalUrl = (req.body.externalUrl as string) || `local://${file?.originalname ?? 'upload'}`;

  if (!file && !req.body.externalUrl) {
    res.status(400).json({ error: 'A file or externalUrl is required' });
    return;
  }

  const doc = await documentService.createDocumentForTenant(tenantId, {
    title,
    externalUrl,
    mimeType,
    kind,
    metadata: req.body.metadata ? JSON.parse(req.body.metadata) : undefined,
    file,
  });

  res.status(202).json({
    id: doc.id,
    title: doc.title,
    status: doc.status,
    externalUrl: doc.externalUrl,
    mimeType: doc.mimeType,
    kind: doc.kind,
    createdAt: doc.createdAt,
  });
});

export const listDocuments = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  if (!tenantId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const docs = await documentService.listDocuments(tenantId);
  res.json(
    docs.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      kind: d.kind,
      mimeType: d.mimeType,
      externalUrl: d.externalUrl,
      pdfUrl: d.pdfUrl,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })),
  );
});

export const getDocumentQuestions = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  if (!tenantId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const params = uuidParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'Invalid document id' });
    return;
  }
  const questions = await documentService.getQuestionsForDocument(tenantId, params.data.id);
  res.json(
    questions.map((q) => {
      const row = q as Question & { answers?: Answer[] };
      return {
        id: row.id,
        documentId: row.documentId,
        text: row.text,
        options: row.options,
        correctAnswer: row.correctAnswer,
        explanation: row.explanation,
        confidenceScore: row.confidenceScore,
        answers: row.answers?.map((a) => ({
          id: a.id,
          selectedOption: a.selectedOption,
          confidenceScore: a.confidenceScore,
          explanation: a.explanation,
          validated: a.validated,
          validationNotes: a.validationNotes,
        })),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }),
  );
});

export const retryDocument = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  if (!tenantId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const params = uuidParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'Invalid document id' });
    return;
  }
  const doc = await documentService.findDocumentScoped(tenantId, params.data.id);
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  await doc.update({ status: 'pending' });

  // Run the full pipeline inline
  runOcrStage(doc.id, tenantId, true).catch((err) => {
    console.error(`[retry] Processing failed for document ${doc.id}:`, err);
  });

  res.json({ ok: true });
});
