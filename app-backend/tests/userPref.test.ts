import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getMyPreferences, updatePreferences } from '../src/modules/userPreference/userPref.controller';
import { AuthenticatedRequest } from '../src/modules/auth/auth.middleware';

// Mock Prisma
type MockedPrismaUserPreference = {
  findUnique: jest.Mock;
  upsert: jest.Mock;
};

jest.mock('@prisma/client', () => {
  const mPrisma = {
    userPreference: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mPrisma) };
});

const prisma = new PrismaClient() as unknown as { userPreference: MockedPrismaUserPreference };

describe('UserPreference Controller Unit Tests (Mocked Prisma)', () => {
  const mockUser = { id: 'user-123' };

  const mockRes = (): Response => {
    const res: Partial<Response> = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    return res as Response;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyPreferences', () => {
    it('should fetch user preferences for authenticated user', async () => {
      const req = { user: mockUser } as AuthenticatedRequest;
      const res = mockRes();

      const mockPreference = {
        userId: 'user-123',
        style: 'Casual',
        preferredColours: ['#E53935', '#3949AB'],
        learningWeight: 0.5,
      };
      prisma.userPreference.findUnique.mockResolvedValueOnce(mockPreference);

      await getMyPreferences(req, res);

      expect(prisma.userPreference.findUnique).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        style: mockPreference.style,
        preferredColours: mockPreference.preferredColours,
        learningWeight: mockPreference.learningWeight,
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      const req = { user: undefined } as unknown as AuthenticatedRequest;
      const res = mockRes();

      await getMyPreferences(req, res);

      expect(prisma.userPreference.findUnique).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('should return 404 if preferences not found', async () => {
      const req = { user: mockUser } as AuthenticatedRequest;
      const res = mockRes();

      prisma.userPreference.findUnique.mockResolvedValueOnce(null);

      await getMyPreferences(req, res);

      expect(prisma.userPreference.findUnique).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Preferences not found' });
    });

    it('should return 500 on server error', async () => {
      const req = { user: mockUser } as AuthenticatedRequest;
      const res = mockRes();

      // Silence console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      prisma.userPreference.findUnique.mockRejectedValueOnce(new Error('Database error'));

      await getMyPreferences(req, res);

      expect(prisma.userPreference.findUnique).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });

      // Restore original console.error
      consoleSpy.mockRestore();
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences for authenticated user', async () => {
      const req = {
        user: mockUser,
        body: {
          style: 'Formal',
          preferredColours: ['#E53935', '#3949AB'],
          learningWeight: 0.7,
        },
      } as AuthenticatedRequest;
      const res = mockRes();

      const mockUpdatedPreference = {
        userId: 'user-123',
        style: 'Formal',
        preferredColours: ['#E53935', '#3949AB'],
        learningWeight: 0.7,
      };
      prisma.userPreference.upsert.mockResolvedValueOnce(mockUpdatedPreference);

      await updatePreferences(req, res);

      expect(prisma.userPreference.upsert).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        update: req.body,
        create: { userId: mockUser.id, ...req.body },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        style: mockUpdatedPreference.style,
        preferredColours: mockUpdatedPreference.preferredColours,
        learningWeight: mockUpdatedPreference.learningWeight,
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      const req = { user: undefined, body: {} } as unknown as AuthenticatedRequest;
      const res = mockRes();

      await updatePreferences(req, res);

      expect(prisma.userPreference.upsert).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('should return 400 if request body is invalid', async () => {
      const req = {
        user: mockUser,
        body: { style: 'Formal' }, // Missing preferredColours
      } as AuthenticatedRequest;
      const res = mockRes();

      await updatePreferences(req, res);

      expect(prisma.userPreference.upsert).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid request body' });
    });

    it('should return 400 if preferredColours is empty', async () => {
      const req = {
        user: mockUser,
        body: { style: 'Formal', preferredColours: [], learningWeight: 0.7 },
      } as AuthenticatedRequest;
      const res = mockRes();

      await updatePreferences(req, res);

      expect(prisma.userPreference.upsert).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Preferred colours must be between 1 and 5' });
    });

    it('should return 400 if preferredColours exceeds 5', async () => {
      const req = {
        user: mockUser,
        body: {
          style: 'Formal',
          preferredColours: ['#E53935', '#3949AB', '#00897B', '#43A047', '#FDD835', '#F4511E'],
          learningWeight: 0.7,
        },
      } as AuthenticatedRequest;
      const res = mockRes();

      await updatePreferences(req, res);

      expect(prisma.userPreference.upsert).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Preferred colours must be between 1 and 5' });
    });

    it('should return 500 on server error', async () => {
      const req = {
        user: mockUser,
        body: {
          style: 'Formal',
          preferredColours: ['#E53935'],
          learningWeight: 0.7,
        },
      } as AuthenticatedRequest;
      const res = mockRes();

      // Silence console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      prisma.userPreference.upsert.mockRejectedValueOnce(new Error('Database error'));

      await updatePreferences(req, res);

      expect(prisma.userPreference.upsert).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });

      // Restore original console.error
      consoleSpy.mockRestore();
    });
  });
});