import { Request, Response, NextFunction } from 'express';
import { PrismaClient, UserPreference } from '@prisma/client';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { z } from 'zod';

export const prisma = new PrismaClient();

const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format");

const preferenceSchema = z.object({
  style: z.enum(["Formal", "Casual", "Athletic", "Party", "Business", "Outdoor"]),
  preferredColours: z.array(hexColorSchema),
  learningWeight: z.number().nullable().optional(),
});

class UserPref {
  // GET /api/preferences
  getUserPref = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { user } = req as AuthenticatedRequest;
    if (!user || !user.id) {
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
    if (!user || !user.id) {
      res.status(401).json({ message: 'Unauthorized: User not authenticated' });
      return;
    }

    try {
      const { style, preferredColours, learningWeight } = preferenceSchema.parse(req.body);

      // Check if preferences exist to determine status code
      const existingPreferences = await prisma.userPreference.findUnique({
        where: { userId: user.id },
      });

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

      res.status(existingPreferences ? 200 : 201).json(updatedPreferences);
    } catch (err) {
      next(err);
    }
  };
}

export default new UserPref();