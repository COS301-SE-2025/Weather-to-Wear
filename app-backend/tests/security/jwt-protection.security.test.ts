import request from "supertest";
import app from "../../src/app";
import jwt from "jsonwebtoken";

describe('Security: JWT Protection Tests', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'defaultsecret';
  const validToken = jwt.sign({ id: 'test-user', email: 'test@test.com' }, JWT_SECRET, { expiresIn: '1h' });
  const expiredToken = jwt.sign({ id: 'test-user', email: 'test@test.com' }, JWT_SECRET, { expiresIn: '-1h' });
  const invalidToken = 'invalid.jwt.token';
  const malformedToken = 'not.a.valid.jwt.format';

  // Helper function to make requests with proper typing
  const makeRequest = (method: string, path: string, token?: string, body?: any) => {
    const req = (request(app) as any)[method.toLowerCase()](path);
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    if (body) {
      req.send(body);
    }
    return req;
  };

  // Comprehensive list of all protected routes in your application
  const protectedRoutes = [
    // Auth routes
    { method: 'GET', path: '/api/auth/profile' },
    { method: 'DELETE', path: '/api/auth/users/test-id' },

    // Closet routes
    { method: 'POST', path: '/api/closet/upload' },
    { method: 'POST', path: '/api/closet/upload/batch' },
    { method: 'GET', path: '/api/closet/all' },
    { method: 'GET', path: '/api/closet/category/TOPS' },
    { method: 'DELETE', path: '/api/closet/test-id' },
    { method: 'PATCH', path: '/api/closet/test-id' },
    { method: 'PATCH', path: '/api/closet/test-id/favourite' },

    // Events routes
    { method: 'GET', path: '/api/events/getEvents' },
    { method: 'GET', path: '/api/events/getEvent' },
    { method: 'POST', path: '/api/events/createEvent' },
    { method: 'PUT', path: '/api/events/updateEvent' },
    { method: 'DELETE', path: '/api/events/deleteEvent' },

    // Outfit routes
    { method: 'POST', path: '/api/outfits' },
    { method: 'GET', path: '/api/outfits' },
    { method: 'GET', path: '/api/outfits/test-id' },
    { method: 'PUT', path: '/api/outfits/test-id' },
    { method: 'DELETE', path: '/api/outfits/test-id' },
    { method: 'GET', path: '/api/outfits/test-id/items' },
    { method: 'POST', path: '/api/outfits/test-id/items' },
    { method: 'DELETE', path: '/api/outfits/test-id/items/item-id' },
    { method: 'POST', path: '/api/outfits/recommend' },
    { method: 'PATCH', path: '/api/outfits/test-id/favourite' },

    // Preferences routes
    { method: 'GET', path: '/api/preferences' },
    { method: 'PUT', path: '/api/preferences' },

    // Packing routes
    { method: 'POST', path: '/api/packing' },
    { method: 'GET', path: '/api/packing/trip-id' },
    { method: 'PUT', path: '/api/packing/list-id' },
    { method: 'DELETE', path: '/api/packing/list-id' },

    // Social routes
    { method: 'GET', path: '/api/social/posts' },
    { method: 'POST', path: '/api/social/posts' },
    { method: 'PATCH', path: '/api/social/posts/test-id' },
    { method: 'DELETE', path: '/api/social/posts/test-id' },
    { method: 'POST', path: '/api/social/posts/test-id/comments' },
    { method: 'PUT', path: '/api/social/comments/test-id' },
    { method: 'DELETE', path: '/api/social/comments/test-id' },
    { method: 'POST', path: '/api/social/posts/test-id/likes' },
    { method: 'DELETE', path: '/api/social/posts/test-id/likes' },
    { method: 'GET', path: '/api/social/test-id/following' },
    { method: 'GET', path: '/api/social/test-id/followers' },
    { method: 'POST', path: '/api/social/test-id/follow' },
    { method: 'DELETE', path: '/api/social/test-id/unfollow' },
    { method: 'GET', path: '/api/social/users/search' },
    { method: 'GET', path: '/api/social/notifications' },
    { method: 'POST', path: '/api/social/follow/test-id/accept' },
    { method: 'POST', path: '/api/social/follow/test-id/reject' },

    // Users routes
    { method: 'GET', path: '/api/users/me' },
    { method: 'PATCH', path: '/api/users/me/profile-photo' },
    { method: 'PATCH', path: '/api/users/me/privacy' },

    // Inspo routes
    { method: 'POST', path: '/api/inspo/like' },
    { method: 'POST', path: '/api/inspo/generate' },
    { method: 'GET', path: '/api/inspo' },
    { method: 'DELETE', path: '/api/inspo/test-id' },

    // Day selection routes
    { method: 'POST', path: '/api/day-selections' },
    { method: 'GET', path: '/api/day-selections/2024-01-01' },
    { method: 'GET', path: '/api/day-selections' },
    { method: 'PATCH', path: '/api/day-selections/test-id' },
    { method: 'DELETE', path: '/api/day-selections/2024-01-01' },

    // Try-on routes
    { method: 'GET', path: '/api/tryon/fits' },
    { method: 'POST', path: '/api/tryon/fits' },

    // Try-on self routes
    { method: 'POST', path: '/api/tryon-self/run' },
    { method: 'GET', path: '/api/tryon-self/credits' },
    { method: 'POST', path: '/api/tryon-self/photo' },
    { method: 'GET', path: '/api/tryon-self/photo' },
    { method: 'DELETE', path: '/api/tryon-self/photo' },
    { method: 'GET', path: '/api/tryon-self/result/test-id' },
    { method: 'DELETE', path: '/api/tryon-self/result/test-id' },
  ];

  describe('Routes Without Authorization Header', () => {
    protectedRoutes.forEach(({ method, path }) => {
      it(`${method} ${path} should reject requests without Authorization header (401)`, async () => {
        const res = await makeRequest(method, path);
        expect(res.status).toBe(401);
        expect(res.body.error || res.body.message).toMatch(/unauthorized|missing token|no token/i);
        expect(res.body.code).toBe('NO_TOKEN');
      });
    });
  });

  describe('Routes With Invalid JWT', () => {
    protectedRoutes.forEach(({ method, path }) => {
      it(`${method} ${path} should reject requests with invalid JWT (401)`, async () => {
        const res = await makeRequest(method, path, invalidToken);
        expect(res.status).toBe(401);
        expect(res.body.error || res.body.message).toMatch(/invalid token|unauthorized/i);
        expect(res.body.code).toBe('INVALID_TOKEN');
      });
    });
  });

  describe('Routes With Malformed JWT', () => {
    protectedRoutes.forEach(({ method, path }) => {
      it(`${method} ${path} should reject requests with malformed JWT (401)`, async () => {
        const res = await makeRequest(method, path, malformedToken);
        expect(res.status).toBe(401);
        expect(res.body.error || res.body.message).toMatch(/invalid token|unauthorized/i);
        expect(res.body.code).toBe('INVALID_TOKEN');
      });
    });
  });

  describe('Routes With Expired JWT', () => {
    protectedRoutes.forEach(({ method, path }) => {
      it(`${method} ${path} should reject requests with expired JWT (401)`, async () => {
        const res = await makeRequest(method, path, expiredToken);
        expect(res.status).toBe(401);
        expect(res.body.error || res.body.message).toMatch(/expired|session.*expired/i);
        expect(res.body.code).toBe('SESSION_EXPIRED');
        expect(res.headers['x-session-expired']).toBe('true');
      });
    });
  });

  describe('Routes With Valid JWT', () => {
    protectedRoutes.forEach(({ method, path }) => {
      it(`${method} ${path} should accept requests with valid JWT (not 401)`, async () => {
        const res = await makeRequest(method, path, validToken);
        
        // Should not be 401 (may be 400, 404, 500, etc. due to missing data/resources)
        expect(res.status).not.toBe(401);
        
        // If it's a client error, it should be due to missing data, not auth
        if (res.status >= 400 && res.status < 500) {
          expect(res.body.error || res.body.message || '').not.toMatch(/unauthorized|missing token|invalid token/i);
        }
      });
    });
  });

  describe('Authorization Header Variations', () => {
    const testRoute = { method: 'GET', path: '/api/auth/profile' };

    it('should reject missing "Bearer" prefix', async () => {
      const res = await request(app)
        .get(testRoute.path)
        .set('Authorization', validToken);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('NO_TOKEN');
    });

    it('should reject empty Authorization header', async () => {
      const res = await request(app)
        .get(testRoute.path)
        .set('Authorization', '');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('NO_TOKEN');
    });

    it('should reject "Bearer" without token', async () => {
      const res = await request(app)
        .get(testRoute.path)
        .set('Authorization', 'Bearer ');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('NO_TOKEN');
    });

    it('should reject wrong authentication scheme', async () => {
      const res = await request(app)
        .get(testRoute.path)
        .set('Authorization', `Basic ${validToken}`);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('NO_TOKEN');
    });
  });

  describe('JWT Token Security', () => {
    it('should reject tokens signed with wrong secret', () => {
      const wrongSecretToken = jwt.sign({ id: 'test-user', email: 'test@test.com' }, 'wrong-secret');
      
      return request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${wrongSecretToken}`)
        .expect(401)
        .expect((res) => {
          expect(res.body.code).toBe('INVALID_TOKEN');
        });
    });

    it('should reject tokens with tampered payload', () => {
      // Create a token and tamper with it
      const parts = validToken.split('.');
      const tamperedPayload = Buffer.from('{"id":"hacker","email":"hacker@evil.com"}').toString('base64url');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
      
      return request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401)
        .expect((res) => {
          expect(res.body.code).toBe('INVALID_TOKEN');
        });
    });

    it('should reject tokens with invalid signature', () => {
      const parts = validToken.split('.');
      const invalidSignature = 'invalid_signature';
      const tokenWithInvalidSig = `${parts[0]}.${parts[1]}.${invalidSignature}`;
      
      return request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${tokenWithInvalidSig}`)
        .expect(401)
        .expect((res) => {
          expect(res.body.code).toBe('INVALID_TOKEN');
        });
    });
  });

  describe('Public Routes Should Not Require Authentication', () => {
    const publicRoutes = [
      { method: 'POST', path: '/api/auth/signup', body: { name: 'Test', email: 'test@test.com', password: 'Test123!' } },
      { method: 'GET', path: '/api/social/posts/test-id' },
      { method: 'GET', path: '/healthz' },
    ];

    publicRoutes.forEach(({ method, path, body }) => {
      it(`${method} ${path} should be accessible without authentication`, async () => {
        const res = await makeRequest(method, path, undefined, body);
        
        // Should not return 401 (may return other status codes due to validation, missing data, etc.)
        expect(res.status).not.toBe(401);
      });
    });

    it('POST /api/auth/login should be accessible without authentication but require credentials', async () => {
      // Test login endpoint without credentials - should return 400 (bad request), not 401 (unauthorized)
      const res = await makeRequest('POST', '/api/auth/login', undefined, {});
      
      // Should not return 401 since the endpoint itself doesn't require auth
      // But should return 400 for missing credentials
      expect(res.status).not.toBe(401);
      expect([400, 422]).toContain(res.status); // Bad request for missing credentials
    });
  });

  describe('Token Extraction Edge Cases', () => {
    it('should handle case-insensitive Authorization header', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('authorization', `Bearer ${validToken}`);
      expect(res.status).not.toBe(401);
    });

    it('should handle multiple spaces in Authorization header', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer    ${validToken}`);
      expect(res.status).toBe(401); // Should fail due to extra spaces
      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('should handle extra Bearer prefixes', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer Bearer ${validToken}`);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });
  });
});
