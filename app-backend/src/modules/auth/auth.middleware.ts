import { Request, Response, NextFunction } from 'express';
import { validatePassword } from './auth.utils';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'defaultsecret';

interface AuthenticatedRequest extends Request {
  user?: any;
}


export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expecting: Bearer <token>

  if (!token) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }

    req.user = user; // attach user to request
    next();
  });
}

export function signupPasswordValidation(
  req: Request,
  res: Response,
  next: NextFunction
): void {                            // explicitly returns void
  const pw = req.body.password as string;
  if (!pw || !validatePassword(pw)) {
    // send the 400 *then* exit with a bare `return`
    res.status(400).json({
      error:
        'Password must be ≥ 8 characters, include at least one lowercase letter, one uppercase letter, and one special character.',
    });
    return;                          // ← no returned value
  }
  next();
}
