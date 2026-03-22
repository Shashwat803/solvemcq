import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(3001),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().optional(),
    REDIS_DISABLED: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v === 'true'),
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default('7d'),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().default('gpt-4o-mini'),
    SYNC_DB: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v === 'true'),
    BCRYPT_ROUNDS: z.coerce.number().min(10).max(14).default(12),
  })
  .superRefine((data, ctx) => {
    if (!data.REDIS_DISABLED && (!data.REDIS_URL || data.REDIS_URL.length < 1)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['REDIS_URL'],
        message: 'Set REDIS_URL, or set REDIS_DISABLED=true to run the API without background jobs (workers still need Redis)',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function env(): Env {
  if (!cached) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new Error(`Invalid environment: ${msg}`);
    }
    cached = parsed.data;
  }
  return cached;
}
