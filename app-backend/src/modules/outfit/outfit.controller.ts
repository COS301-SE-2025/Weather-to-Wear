import { Request, Response, NextFunction } from 'express';
import {
  createOutfit,
  getAllOutfitsForUser,
  getOutfitById,
  updateOutfit,
  deleteOutfit,
  getItemsForOutfit,
  addItemToOutfit,
  removeItemFromOutfit,
  toggleFavourite,

} from './outfit.service';
import { recommendOutfits } from './outfitRecommender.service';
import { RecommendOutfitsRequest } from './outfit.types';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { OverallStyle, LayerCategory } from '@prisma/client';
import { cdnUrlFor } from '../../utils/s3';

function mapOutfitForClient(o: any) {
  return {
    id: o.id,
    userId: o.userId,
    favourite: o.favourite,
    warmthRating: o.warmthRating,
    waterproof: o.waterproof,
    overallStyle: o.overallStyle,
    userRating: o.userRating,
    weatherSummary: o.weatherSummary,
    outfitItems: (o.outfitItems || []).map((oi: any) => ({
      closetItemId: oi.closetItemId,
      layerCategory: oi.layerCategory,
      sortOrder: oi.sortOrder,
      category: oi.closetItem?.category ?? null,
      imageUrl:
        oi.imageUrl && oi.imageUrl.length > 0
          ? oi.imageUrl
          : (oi.closetItem?.filename ? cdnUrlFor(oi.closetItem.filename) : ''),
    })),
  };
}

class OutfitController {

  // -----------------------------
  //          Outfit
  // -----------------------------
  // create
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user?.id) { res.status(401).json({ error: 'Unauthorized' }); return; }

      const { outfitItems, warmthRating, waterproof, overallStyle, weatherSummary, userRating } = req.body;
      if (!Array.isArray(outfitItems)
        || !Object.values(OverallStyle).includes(overallStyle)
        || outfitItems.some((item: any) => !Object.values(LayerCategory).includes(item.layerCategory))) {
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

      res.status(201).json(mapOutfitForClient(outfit));
    } catch (err) {
      next(err);
    }
  };

  // get all 
  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user?.id) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const outfits = await getAllOutfitsForUser(user.id);
      res.status(200).json(outfits.map(mapOutfitForClient));
    } catch (err) {
      next(err);
    }
  };

  // get single
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user?.id) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { id } = req.params;
      const outfit = await getOutfitById(id, user.id);
      res.status(200).json(mapOutfitForClient(outfit));
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  };

  // edit 
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user?.id) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { id } = req.params;
      const { userRating, outfitItems, overallStyle } = req.body;

      const updated = await updateOutfit({
        userId: user.id,
        outfitId: id,
        userRating,
        outfitItems,
        overallStyle
      });

      res.status(200).json(mapOutfitForClient(updated));
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

  getItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      const { id } = req.params;
      if (!user?.id) { res.status(401).json({ error: 'Unauthorized' }); return; }

      const items = await getItemsForOutfit(id, user.id);
      const mapped = items.map((oi: any) => ({
        id: oi.id,
        outfitId: oi.outfitId,
        closetItemId: oi.closetItemId,
        layerCategory: oi.layerCategory,
        sortOrder: oi.sortOrder,
        category: oi.closetItem?.category ?? null,
        imageUrl:
          oi.imageUrl && oi.imageUrl.length > 0
            ? oi.imageUrl
            : (oi.closetItem?.filename ? cdnUrlFor(oi.closetItem.filename) : ''),
      }));

      res.status(200).json(mapped);
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

  // ---------------------------------
  //           Recommend
  // ----------------------------------
  recommend = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user || !user.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const recommendations = await recommendOutfits(user.id, req.body);
      res.status(200).json(recommendations);
    } catch (err) {
      next(err);
    }
  };

  toggleFavourite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      const { user } = req as AuthenticatedRequest;
      if (!user?.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      const updated = await toggleFavourite(id, user.id);
      res.status(200).json({
        id: updated.id,
        favourite: updated.favourite,
      });
    } catch (err) {
      next(err);
    }
  };

}

export default new OutfitController();