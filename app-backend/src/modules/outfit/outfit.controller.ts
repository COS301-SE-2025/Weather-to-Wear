import { Request, Response, NextFunction } from 'express';
import { createOutfit, getAllOutfitsForUser, getOutfitById } from './outfit.service';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { OverallStyle, LayerCategory } from '@prisma/client';

class OutfitController {
  // create
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user || !user.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const {
        outfitItems,
        warmthRating,
        waterproof,
        overallStyle,
        weatherSummary,
        userRating
      } = req.body;

      // Validate enums
      if (
        !Array.isArray(outfitItems) ||
        !Object.values(OverallStyle).includes(overallStyle) ||
        outfitItems.some((item: any) => !Object.values(LayerCategory).includes(item.layerCategory))
      ) {
        res.status(400).json({ error: 'Invalid enum values in request' });
        return;
      }

      const outfit = await createOutfit({
        userId: user.id,
        outfitItems,
        warmthRating,
        waterproof,
        overallStyle,
        weatherSummary,
        userRating
      });

      res.status(201).json(outfit);
    } catch (err) {
      next(err);
    }
  };

  // get all 
  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user || !user.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const outfits = await getAllOutfitsForUser(user.id);
      res.status(200).json(outfits);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user || !user.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const { id } = req.params;
      const outfit = await getOutfitById(id, user.id);
      res.status(200).json(outfit);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  };


}

export default new OutfitController();