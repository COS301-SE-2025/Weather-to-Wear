import { Request, Response, NextFunction } from 'express';
import UserPrefController from '../src/modules/userPreference/userPref.controller';
import userPrefRoutes from '../src/modules/userPreference/userPref.routes';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../src/auth/auth.middleware'; // Import AuthenticatedRequest

const prisma = new PrismaClient();
const TEST_USER = { id: 'test-user-id', email: 'test@test.com' };
const TEST_TOKEN = jwt.sign(TEST_USER, process.env.JWT_SECRET || 'defaultsecret');

describe('UserPref', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
    (prisma.userPreference.findUnique as jest.Mock).mockReset();
    (prisma.userPreference.upsert as jest.Mock).mockReset();
    req.headers = { authorization: `Bearer ${TEST_TOKEN}` };
  });

  describe('Controller', () => {
    describe('getUserPref', () => {
      it('returns 401 if user is not authenticated', async () => {
        (req as AuthenticatedRequest).user = undefined;

        await UserPrefController.getUserPref(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized: User not authenticated' });
        expect(prisma.userPreference.findUnique).not.toHaveBeenCalled();
        expect(next).not.toHaveBeenCalled();
      });

      it('returns 200 with user preferences', async () => {
        const mockPreferences = {
          id: 'pref-123',
          userId: 'test-user-id',
          style: 'Casual',
          preferredColours: [{ min: 127, max: 153 }],
          learningWeight: null,
          updatedAt: new Date('2025-06-21T00:05:00Z'),
        };
        (prisma.userPreference.findUnique as jest.Mock).mockResolvedValue(mockPreferences);
        (req as AuthenticatedRequest).user = { ...TEST_USER };

        await UserPrefController.getUserPref(req as Request, res as Response, next);

        expect(prisma.userPreference.findUnique).toHaveBeenCalledWith({
          where: { userId: 'test-user-id' },
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockPreferences);
        expect(next).not.toHaveBeenCalled();
      });

      it('returns 404 when preferences not found', async () => {
        (prisma.userPreference.findUnique as jest.Mock).mockResolvedValue(null);
        (req as AuthenticatedRequest).user = { ...TEST_USER };

        await UserPrefController.getUserPref(req as Request, res as Response, next);

        expect(prisma.userPreference.findUnique).toHaveBeenCalledWith({
          where: { userId: 'test-user-id' },
        });
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'User preferences not found.' });
        expect(next).not.toHaveBeenCalled();
      });

      it('forwards errors to next()', async () => {
        const error = new Error('Database error');
        (prisma.userPreference.findUnique as jest.Mock).mockRejectedValue(error);
        (req as AuthenticatedRequest).user = { ...TEST_USER };

        await UserPrefController.getUserPref(req as Request, res as Response, next);

        expect(prisma.userPreference.findUnique).toHaveBeenCalledWith({
          where: { userId: 'test-user-id' },
        });
        expect(next).toHaveBeenCalledWith(error);
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
      });
    });

    describe('updateUserPref', () => {
      it('returns 401 if user is not authenticated', async () => {
        (req as AuthenticatedRequest).user = undefined;

        await UserPrefController.updateUserPref(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized: User not authenticated' });
        expect(prisma.userPreference.upsert).not.toHaveBeenCalled();
        expect(next).not.toHaveBeenCalled();
      });

      it('updates preferences and returns 200', async () => {
        const mockUpdatedPreferences = {
          id: 'pref-123',
          userId: 'test-user-id',
          style: 'Athletic',
          preferredColours: [{ min: 127, max: 153 }],
          learningWeight: null,
          updatedAt: new Date('2025-06-21T00:05:00Z'),
        };
        (req as AuthenticatedRequest).user = { ...TEST_USER };
        req.body = {
          style: 'Athletic',
          preferredColours: [{ min: 127, max: 153 }],
          learningWeight: null,
        };
        (prisma.userPreference.upsert as jest.Mock).mockResolvedValue(mockUpdatedPreferences);

        await UserPrefController.updateUserPref(req as Request, res as Response, next);

        expect(prisma.userPreference.upsert).toHaveBeenCalledWith({
          where: { userId: 'test-user-id' },
          update: {
            style: 'Athletic',
            preferredColours: [{ min: 127, max: 153 }],
            learningWeight: null,
          },
          create: {
            userId: 'test-user-id',
            style: 'Athletic',
            preferredColours: [{ min: 127, max: 153 }],
            learningWeight: null,
          },
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockUpdatedPreferences);
        expect(next).not.toHaveBeenCalled();
      });

      it('forwards errors to next()', async () => {
        const error = new Error('Database error');
        (req as AuthenticatedRequest).user = { ...TEST_USER };
        req.body = {
          style: 'Athletic',
          preferredColours: [{ min: 127, max: 153 }],
          learningWeight: null,
        };
        (prisma.userPreference.upsert as jest.Mock).mockRejectedValue(error);

        await UserPrefController.updateUserPref(req as Request, res as Response, next);

        expect(prisma.userPreference.upsert).toHaveBeenCalledWith({
          where: { userId: 'test-user-id' },
          update: {
            style: 'Athletic',
            preferredColours: [{ min: 127, max: 153 }],
            learningWeight: null,
          },
          create: {
            userId: 'test-user-id',
            style: 'Athletic',
            preferredColours: [{ min: 127, max: 153 }],
            learningWeight: null,
          },
        });
        expect(next).toHaveBeenCalledWith(error);
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
      });
    });
  });

  describe('Routes', () => {
    describe('GET /', () => {
      it('returns 200 with user preferences', async () => {
        const mockPreferences = {
          id: 'pref-123',
          userId: 'test-user-id',
          style: 'Casual',
          preferredColours: [{ min: 127, max: 153 }],
          learningWeight: null,
          updatedAt: new Date('2025-06-21T00:05:00Z'),
        };
        (prisma.userPreference.findUnique as jest.Mock).mockResolvedValue(mockPreferences);
        (req as AuthenticatedRequest).user = { ...TEST_USER };

        const routeHandler = userPrefRoutes.stack.find(
          (layer) => layer.route?.path === '/' && layer.route?.methods['get'] === true
        )?.route?.stack[1].handle;
        if (!routeHandler) {
          throw new Error('Route handler for GET / not found');
        }
        await routeHandler(req as Request, res as Response, next);

        expect(prisma.userPreference.findUnique).toHaveBeenCalledWith({
          where: { userId: 'test-user-id' },
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockPreferences);
        expect(next).not.toHaveBeenCalled();
      });

      it('returns 404 when preferences not found', async () => {
        (prisma.userPreference.findUnique as jest.Mock).mockResolvedValue(null);
        (req as AuthenticatedRequest).user = { ...TEST_USER };

        const routeHandler = userPrefRoutes.stack.find(
          (layer) => layer.route?.path === '/' && layer.route?.methods['get'] === true
        )?.route?.stack[1].handle;
        if (!routeHandler) {
          throw new Error('Route handler for GET / not found');
        }
        await routeHandler(req as Request, res as Response, next);

        expect(prisma.userPreference.findUnique).toHaveBeenCalledWith({
          where: { userId: 'test-user-id' },
        });
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'User preferences not found.' });
        expect(next).not.toHaveBeenCalled();
      });

      it('returns 401 if user is not authenticated', async () => {
        (req as AuthenticatedRequest).user = undefined;

        const routeHandler = userPrefRoutes.stack.find(
          (layer) => layer.route?.path === '/' && layer.route?.methods['get'] === true
        )?.route?.stack[1].handle;
        if (!routeHandler) {
          throw new Error('Route handler for GET / not found');
        }
        await routeHandler(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized: User not authenticated' });
        expect(prisma.userPreference.findUnique).not.toHaveBeenCalled();
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('PUT /', () => {
      it('updates preferences and returns 200', async () => {
        const mockUpdatedPreferences = {
          id: 'pref-123',
          userId: 'test-user-id',
          style: 'Athletic',
          preferredColours: [{ min: 127, max: 153 }],
          learningWeight: null,
          updatedAt: new Date('2025-06-21T00:05:00Z'),
        };
        (req as AuthenticatedRequest).user = { ...TEST_USER };
        req.body = {
          style: 'Athletic',
          preferredColours: [{ min: 127, max: 153 }],
          learningWeight: null,
        };
        (prisma.userPreference.upsert as jest.Mock).mockResolvedValue(mockUpdatedPreferences);

        const routeHandler = userPrefRoutes.stack.find(
          (layer) => layer.route?.path === '/' && layer.route?.methods['put'] === true
        )?.route?.stack[1].handle;
        if (!routeHandler) {
          throw new Error('Route handler for PUT / not found');
        }
        await routeHandler(req as Request, res as Response, next);

        expect(prisma.userPreference.upsert).toHaveBeenCalledWith({
          where: { userId: 'test-user-id' },
          update: {
            style: 'Athletic',
            preferredColours: [{ min: 127, max: 153 }],
            learningWeight: null,
          },
          create: {
            userId: 'test-user-id',
            style: 'Athletic',
            preferredColours: [{ min: 127, max: 153 }],
            learningWeight: null,
          },
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockUpdatedPreferences);
        expect(next).not.toHaveBeenCalled();
      });

      it('returns 401 if user is not authenticated', async () => {
        (req as AuthenticatedRequest).user = undefined;
        req.body = {
          style: 'Athletic',
          preferredColours: [{ min: 127, max: 153 }],
          learningWeight: null,
        };

        const routeHandler = userPrefRoutes.stack.find(
          (layer) => layer.route?.path === '/' && layer.route?.methods['put'] === true
        )?.route?.stack[1].handle;
        if (!routeHandler) {
          throw new Error('Route handler for PUT / not found');
        }
        await routeHandler(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized: User not authenticated' });
        expect(prisma.userPreference.upsert).not.toHaveBeenCalled();
        expect(next).not.toHaveBeenCalled();
      });
    });
  });
});

// Mock authenticateToken
jest.mock('../src/auth/auth.middleware', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    if (req.headers.authorization === `Bearer ${TEST_TOKEN}`) {
      (req as AuthenticatedRequest).user = { ...TEST_USER };
    } else {
      (req as AuthenticatedRequest).user = undefined;
    }
    next();
  },
}));