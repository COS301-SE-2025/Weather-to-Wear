// src/modules/auth/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { validatePassword } from './auth.utils';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'defaultsecret';

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    res.status(401).json({ code: 'NO_TOKEN', error: 'Missing token' });
    return;
  }

  // Check if the header starts with "Bearer "
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ code: 'NO_TOKEN', error: 'Missing token' });
    return;
  }

  // Extract the token (everything after "Bearer ")
  const token = authHeader.substring(7); // "Bearer ".length = 7

  if (!token || token.trim() === '') {
    res.status(401).json({ code: 'NO_TOKEN', error: 'Missing token' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      if ((err as any)?.name === 'TokenExpiredError') {
        res.setHeader('X-Session-Expired', 'true');
        res.status(401).json({
          code: 'SESSION_EXPIRED',
          error: 'Your session has expired. Please sign in again.',
        });
        return;
      }

      res.status(401).json({ code: 'INVALID_TOKEN', error: 'Invalid token' });
      return;
    }

    req.user = decoded as AuthUser;
    next();
  });
}

export function signupPasswordValidation(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const pw = req.body.password as string;
  if (!pw || !validatePassword(pw)) {
    res.status(400).json({
      error:
        'Password must be ≥ 8 characters, include at least one lowercase letter, one uppercase letter, and one special character.',
    });
    return;
  }
  next();
}
