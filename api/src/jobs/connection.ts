import { env } from '../config/env';

/** BullMQ accepts a Redis URL without bundling a second `ioredis` instance at the type level. */
export function getBullConnection(): { url: string } {
  const e = env();
  if (e.REDIS_DISABLED) {
    throw new Error('Redis is disabled (REDIS_DISABLED=true). Workers and queue operations require Redis.');
  }
  if (!e.REDIS_URL) {
    throw new Error('REDIS_URL is not set');
  }
  return { url: e.REDIS_URL };
}
