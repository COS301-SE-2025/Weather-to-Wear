import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import userPrefRoutes from '../src/modules/userPreference/userPref.routes';
import controller from '../src/modules/userPreference/userPref.controller';
import { prisma } from '../src/modules/userPreference/userPref.controller';
import type { AuthenticatedRequest } from '../src/modules/auth/auth.middleware';
import { Style } from '@prisma/client'; 

const TEST_USER = { id: 'test-user-id', email: 'test@test.com' };
const TEST_TOKEN = jwt.sign(TEST_USER, process.env.JWT_SECRET || 'defaultsecret');

describe('UserPrefController', () => {
  let req: Partial<AuthenticatedRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.restoreAllMocks();
  });

  describe('getUserPref', () => {
    it('returns 401 if no user', async () => {
      await controller.getUserPref(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized: User not authenticated' });
    });

    it('returns 404 if user preference not found', async () => {
      jest.spyOn(prisma.userPreference, 'findUnique').mockResolvedValue(null);
      req = { user: TEST_USER };
      await controller.getUserPref(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User preferences not found.' });
    });

    it('returns 200 with user preference', async () => {
      const prefs = {
        id: 'pref-id-123',
        userId: TEST_USER.id,
        style: Style.Casual, 
        preferredColours: ['green'],
        learningWeight: 0.8,
        updatedAt: new Date()
      };

      jest.spyOn(prisma.userPreference, 'findUnique').mockResolvedValue(prefs);
      req = { user: TEST_USER };
      await controller.getUserPref(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(prefs);
    });
  });

  describe('updateUserPref', () => {
    it('returns 401 if no user', async () => {
      await controller.updateUserPref(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized: User not authenticated' });
    });

    it('calls prisma.upsert and returns updated preferences', async () => {
      const updatedPrefs = {
        id: 'pref-id-456',
        userId: TEST_USER.id,
        style: Style.Athletic,
        preferredColours: ['blue', 'black'],
        learningWeight: 1.0,
        updatedAt: new Date()
      };

      jest.spyOn(prisma.userPreference, 'upsert').mockResolvedValue(updatedPrefs as any);

      req = {
        user: TEST_USER,
        body: {
          style: Style.Athletic,
          preferredColours: ['blue', 'black'],
          learningWeight: 1.0
        }
      };

      await controller.updateUserPref(req as Request, res as Response, next);

      expect(prisma.userPreference.upsert).toHaveBeenCalledWith({
        where: { userId: TEST_USER.id },
        update: {
          style: Style.Athletic,
          preferredColours: ['blue', 'black'],
          learningWeight: 1.0
        },
        create: {
          userId: TEST_USER.id,
          style: Style.Athletic,
          preferredColours: ['blue', 'black'],
          learningWeight: 1.0
        }
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedPrefs);
    });
  });
});

describe('User Preferences Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/preferences', userPrefRoutes);
    jest.restoreAllMocks();
  });

  it('GET /api/preferences → 200 with stubbed data', async () => {
    jest.spyOn(prisma.userPreference, 'findUnique').mockResolvedValue({
      id: 'pref-id-1',
      userId: TEST_USER.id,
      style: Style.Outdoor,
      preferredColours: ['grey'],
      learningWeight: 0.6,
      updatedAt: new Date()
    });

    const res = await request(app)
      .get('/api/preferences')
      .set('Authorization', `Bearer ${TEST_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: 'pref-id-1',
      userId: TEST_USER.id,
      style: 'Outdoor',
      preferredColours: ['grey'],
      learningWeight: 0.6,
      updatedAt: expect.any(String)
    });
  });

  it('PUT /api/preferences → 200 after update', async () => {
    jest.spyOn(prisma.userPreference, 'upsert').mockResolvedValue({
      id: 'pref-id-2',
      userId: TEST_USER.id,
      style: Style.Formal,
      preferredColours: ['black', 'red'],
      learningWeight: 0.95,
      updatedAt: new Date()
    });

    const res = await request(app)
      .put('/api/preferences')
      .send({
        style: Style.Formal,
        preferredColours: ['black', 'red'],
        learningWeight: 0.95
      })
      .set('Authorization', `Bearer ${TEST_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: 'pref-id-2',
      userId: TEST_USER.id,
      style: 'Formal',
      preferredColours: ['black', 'red'],
      learningWeight: 0.95,
      updatedAt: expect.any(String)
    });
  });
});
