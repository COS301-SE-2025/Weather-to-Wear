// Security Headers Middleware
// Add this to your app.ts to implement production security headers

import { Request, Response, NextFunction } from 'express';

export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Prevent clickjacking attacks
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS filtering (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // HTTPS-only security headers (only set if request is secure)
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    // Force HTTPS for future requests
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Content Security Policy - customize based on your frontend needs
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'", // Allow inline styles for React
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.openweathermap.org", // Add your API domains
    "font-src 'self'",
    "object-src 'none'",
    "media-src 'self'",
    "frame-src 'none'"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  
  // Permissions Policy - control browser features
  const permissions = [
    'camera=()',
    'microphone=()',
    'geolocation=(self)',
    'fullscreen=(self)'
  ].join(', ');
  
  res.setHeader('Permissions-Policy', permissions);
  
  next();
};

// Rate limiting middleware (basic implementation)
const requests = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Clean up old entries
    if (now % 1000 === 0) { // Clean every second
      for (const [id, data] of requests.entries()) {
        if (now > data.resetTime) {
          requests.delete(id);
        }
      }
    }
    
    const clientData = requests.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      requests.set(clientId, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }
    
    if (clientData.count >= maxRequests) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
      return;
    }
    
    clientData.count++;
    next();
  };
};

// Cache control for sensitive endpoints
export const noCache = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
};

// Security middleware setup function
export const setupSecurity = (app: any): void => {
  // Apply security headers to all routes
  app.use(securityHeaders);
  
  // Apply rate limiting to all routes
  app.use(rateLimit());
  
  // Apply no-cache to sensitive auth routes
  app.use('/api/auth/profile', noCache);
  app.use('/api/users/me', noCache);
  
  console.log('Security middleware applied');
};
