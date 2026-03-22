import { z } from 'zod';

export const registerSchema = z.object({
  tenantName: z.string().min(1).max(255),
  tenantSlug: z
    .string()
    .min(2)
    .max(128)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  tenantSlug: z.string().min(1).max(128),
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export const uploadDocumentSchema = z.object({
  title: z.string().min(1).max(512),
  externalUrl: z.string().url(),
  mimeType: z.string().min(1).max(128),
  kind: z.enum(['pdf', 'image']),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const uuidParam = z.object({
  id: z.string().uuid(),
});

export const documentIdParam = z.object({
  documentId: z.string().uuid(),
});
