import OpenAI from 'openai';
import { env } from '../config/env';

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI | null {
  const key = env().OPENAI_API_KEY;
  if (!key) return null;
  if (!client) {
    client = new OpenAI({ apiKey: key });
  }
  return client;
}

export function getOpenAIModel(): string {
  return env().OPENAI_MODEL;
}
