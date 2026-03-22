import type { JwtPayload } from './jwt';

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload;
      tenantId?: string;
      userId?: string;
    }
  }
}

export {};
