import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const AUTH_SECRET = process.env.AUTH_SECRET || 'CHANGE_ME_IN_PRODUCTION';

export interface AuthUser {
  userId: string;
  coupleId: string;
  role: string;
  deviceId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, AUTH_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function generateSessionToken(user: AuthUser): string {
  return jwt.sign(user, AUTH_SECRET, { expiresIn: '90d' });
}
