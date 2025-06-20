import { Request, Response, NextFunction } from 'express';
import { PrismaClient, UserPreference } from '@prisma/client';
import { AuthenticatedRequest } from '../auth/auth.middleware';

export const prisma = new PrismaClient();

class UserPref {
  // GET /api/preferences
  getUserPref = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { user } = req as AuthenticatedRequest;
    if (!user) {
      res.status(401).json({ message: 'Unauthorized: User not authenticated' });
      return;
    }
    try {
      const preferences = await prisma.userPreference.findUnique({
        where: { userId: user.id },
      });

      if (!preferences) {
        res.status(404).json({ message: 'User preferences not found.' });
        return;
      }

      res.status(200).json(preferences);
    } catch (err) {
      next(err);
    }
  };

  // PUT /api/preferences
  updateUserPref = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { user } = req as AuthenticatedRequest;
    if (!user) {
      res.status(401).json({ message: 'Unauthorized: User not authenticated' });
      return;
    }
    const { style, preferredColours, learningWeight } = req.body;

    try {
      const updatedPreferences: UserPreference = await prisma.userPreference.upsert({
        where: { userId: user.id },
        update: {
          style,
          preferredColours,
          learningWeight,
        },
        create: {
          userId: user.id,
          style,
          preferredColours,
          learningWeight,
        },
      });

      res.status(200).json(updatedPreferences);
    } catch (err) {
      next(err);
    }
  };
}

export default new UserPref();