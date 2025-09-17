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

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expecting: Bearer <token>

  if (!token) {
    res.status(401).json({ code: 'NO_TOKEN', error: 'Missing token' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      // Handle expiry specifically, so the client can auto-logout.
      // jsonwebtoken sets err.name === 'TokenExpiredError' on expiry.
      if ((err as any)?.name === 'TokenExpiredError') {
        res.setHeader('X-Session-Expired', 'true');
        res.status(401).json({
          code: 'SESSION_EXPIRED',
          error: 'Your session has expired. Please sign in again.',
        });
        return;
      }

      // Invalid for any other reason
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
