import type { RequestHandler } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { JwtPayload } from '../types/jwt';

export type { JwtPayload };

function readBearerToken(authorization: string | undefined): string | null {
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice(7).trim() || null;
}

export const authenticateJwt: RequestHandler = (req, res, next) => {
  const token = readBearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  try {
    const secret = env().JWT_SECRET;
    const decoded = jwt.verify(token, secret) as JwtPayload & jwt.JwtPayload;
    if (!decoded.sub || !decoded.tenantId) {
      res.status(401).json({ error: 'Invalid token payload' });
      return;
    }
    req.auth = {
      sub: decoded.sub,
      tenantId: decoded.tenantId,
      email: decoded.email ?? '',
    };
    req.userId = decoded.sub;
    req.tenantId = decoded.tenantId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export function signJwt(payload: JwtPayload, expiresIn?: string): string {
  const e = env();
  const options: SignOptions = {
    expiresIn: (expiresIn ?? e.JWT_EXPIRES_IN) as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, e.JWT_SECRET, options);
}
