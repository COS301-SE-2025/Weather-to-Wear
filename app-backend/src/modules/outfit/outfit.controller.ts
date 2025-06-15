import { Request, Response, NextFunction } from 'express';
import { 
  createOutfit, 
  getAllOutfitsForUser, 
  getOutfitById, 
  updateOutfit, 
  deleteOutfit,
  getItemsForOutfit,
  addItemToOutfit, 
  removeItemFromOutfit

} from './outfit.service';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { OverallStyle, LayerCategory } from '@prisma/client';

class OutfitController {

  // -----------------------------
  //          Outfit
  // -----------------------------
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

  // get single
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

  // edit 
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user || !user.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const { id } = req.params;
      const { userRating, outfitItems, overallStyle } = req.body;

      // validate enums
      const updated = await updateOutfit({
        userId: user.id,
        outfitId: id,
        userRating,
        outfitItems,
        overallStyle
      });

      res.status(200).json(updated);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  };

  // delete
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user || !user.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const { id } = req.params;
      const result = await deleteOutfit(user.id, id);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  };


  // -----------------------------
  //        Outfit Item 
  // -----------------------------
  // Get items for an outfit
  // GET /api/outfits/:id/items
  getItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      const { id } = req.params;
      if (!user || !user.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const items = await getItemsForOutfit(id, user.id);
      res.status(200).json(items);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  };

  // Add item to an outfit
  // POST /api/outfits/:id/items
  addItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      const { id } = req.params; // outfitId
      const { closetItemId, layerCategory, sortOrder } = req.body;
      if (!user || !user.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      // Validate enum
      if (!Object.values(LayerCategory).includes(layerCategory)) {
        res.status(400).json({ error: 'Invalid layerCategory' });
        return;
      }
      const item = await addItemToOutfit(id, user.id, {
        closetItemId,
        layerCategory,
        sortOrder
      });
      res.status(201).json(item);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  // Remove item from an outfit
  // DELETE /api/outfits/:id/items/:itemId
  removeItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      const { id, itemId } = req.params;
      if (!user || !user.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const result = await removeItemFromOutfit(id, itemId, user.id);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

}

export default new OutfitController();