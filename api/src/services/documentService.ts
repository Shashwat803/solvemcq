import { Document } from '../models/Document';
import { Question } from '../models/Question';
import { Answer } from '../models/Answer';
import { HttpError } from '../utils/HttpError';
import type { DocumentKind } from '../models/Document';
import { env } from '../config/env';
import { getOcrQueue } from '../jobs/queues';
import type { JobPayload } from '../jobs/queues';
import { runOcrStage } from './documentPipeline';
import * as fs from 'fs/promises';
import * as path from 'path';

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

async function ensureUploadsDir() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

export async function createDocumentForTenant(
  tenantId: string,
  input: {
    title: string;
    externalUrl: string;
    mimeType: string;
    kind: DocumentKind;
    metadata?: Record<string, unknown>;
    file?: Express.Multer.File;
  },
): Promise<Document> {
  let localPath: string | null = null;

  if (input.file) {
    await ensureUploadsDir();
    const ext = path.extname(input.file.originalname) || '.pdf';
    const filename = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    localPath = path.join(UPLOADS_DIR, filename);
    await fs.writeFile(localPath, input.file.buffer);
  }

  const doc = await Document.create({
    tenantId,
    title: input.title,
    externalUrl: input.externalUrl,
    mimeType: input.mimeType,
    kind: input.kind,
    status: 'pending',
    metadata: input.metadata ?? null,
    localPath,
    ocrText: null,
    pdfUrl: null,
  });

  const payload: JobPayload = { documentId: doc.id, tenantId };
  if (env().REDIS_DISABLED) {
    // Run the full pipeline inline instead of skipping it
    console.log(`[upload] REDIS_DISABLED: running inline processing for document ${doc.id}`);
    runOcrStage(doc.id, tenantId, true).catch((err) => {
      console.error(`[upload] Inline processing failed for document ${doc.id}:`, err);
    });
  } else {
    await getOcrQueue().add('process-document', payload, { jobId: `ocr-${doc.id}` });
  }

  return doc;
}

export async function listDocuments(tenantId: string): Promise<Document[]> {
  return Document.findAll({
    where: { tenantId },
    order: [['createdAt', 'DESC']],
  });
}

export async function getDocumentForTenant(tenantId: string, documentId: string): Promise<Document> {
  const doc = await Document.findOne({
    where: { id: documentId, tenantId },
  });
  if (!doc) {
    throw new HttpError(404, 'Document not found');
  }
  return doc;
}

export async function getQuestionsForDocument(
  tenantId: string,
  documentId: string,
): Promise<Question[]> {
  await getDocumentForTenant(tenantId, documentId);
  return Question.findAll({
    where: { tenantId, documentId },
    include: [{ model: Answer, as: 'answers', required: false }],
    order: [['createdAt', 'ASC']],
  });
}

export async function getResultsForDocument(
  tenantId: string,
  documentId: string,
): Promise<{
  document: Document;
  questions: Question[];
}> {
  const document = await getDocumentForTenant(tenantId, documentId);
  const questions = await Question.findAll({
    where: { tenantId, documentId },
    include: [{ model: Answer, as: 'answers', required: false }],
    order: [['createdAt', 'ASC']],
  });
  return { document, questions };
}

export async function findDocumentScoped(tenantId: string, documentId: string): Promise<Document | null> {
  return Document.findOne({ where: { id: documentId, tenantId } });
}
