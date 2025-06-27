import { Request, Response, NextFunction } from 'express';
import { UserPreference } from '@prisma/client';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { prisma } from '../prisma/client'; 

class UserPref {
  // GET /api/preferences
  getUserPref = async function (req: Request, res: Response, next: NextFunction) {
    const { user } = req as AuthenticatedRequest;
    try {
      const preferences = await prisma.userPreference.findUnique({
        where: { userId: user.id },
      });

      if (!preferences) {
        return res.status(404).json({ message: 'User preferences not found.' });
      }

      res.status(200).json(preferences);
    } catch (err) {
      next(err);
    }
  };

  // PUT /api/preferences
  updateUserPref = async function (req: Request, res: Response, next: NextFunction) {
    const { user } = req as AuthenticatedRequest;
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