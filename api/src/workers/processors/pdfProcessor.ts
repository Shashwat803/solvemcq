import type { Job } from 'bullmq';
import { Document } from '../../models/Document';
import type { JobPayload } from '../../jobs/queues';
/**
 * Placeholder: wire to a PDF microservice or headless renderer that bundles questions + answers.
 */
export async function processPdfJob(job: Job<JobPayload>): Promise<void> {
  const { documentId, tenantId } = job.data;

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
