import { Request, Response, NextFunction } from 'express';
import {
  storeLikedItem,
  generateInspoOutfits,
  getUserInspoOutfits,
  deleteInspoOutfit
} from './inspo.service';
import { AuthenticatedRequest } from '../auth/auth.middleware';

function mapInspoOutfitForClient(outfit: any) {
  return {
    id: outfit.id,
    overallStyle: outfit.overallStyle,
    warmthRating: outfit.warmthRating,
    waterproof: outfit.waterproof,
    tags: outfit.tags,
    recommendedWeather: outfit.recommendedWeather,
    score: outfit.score,
    inspoItems: outfit.inspoItems.map((item: any) => ({
      closetItemId: item.closetItemId,
      imageUrl: item.imageUrl,
      layerCategory: item.layerCategory,
      category: item.category,
      style: item.style,
      colorHex: item.colorHex,
      warmthFactor: item.warmthFactor,
      waterproof: item.waterproof,
      dominantColors: item.dominantColors,
      sortOrder: item.sortOrder
    }))
  };
}

class InspoController {
  
  // Like an item and store it for future inspiration
  // POST /api/inspo/like
  likeItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user?.id) { 
        res.status(401).json({ error: 'Unauthorized' }); 
        return; 
      }

      const { closetItemId } = req.body;
      if (!closetItemId) {
        res.status(400).json({ error: 'closetItemId is required' });
        return;
      }

      await storeLikedItem(user.id, closetItemId);
      res.status(200).json({ success: true, message: 'Item liked and stored for inspiration' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  // Generate inspiration outfits based on liked items
  // POST /api/inspo/generate
  generateOutfits = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user?.id) { 
        res.status(401).json({ error: 'Unauthorized' }); 
        return; 
      }

      const recommendations = await generateInspoOutfits(user.id, req.body);
      
      if (recommendations.length === 0) {
        res.status(404).json({ 
          error: 'No recommendations available', 
          message: 'Try liking some items from the social feed or rating your outfits to get better recommendations.' 
        });
        return;
      }
      
      res.status(200).json(recommendations.map(mapInspoOutfitForClient));
    } catch (err: any) {
      console.error('Error generating outfits:', err);
      res.status(400).json({ 
        error: 'Failed to generate recommendations',
        message: 'Try liking some items from the social feed or rating your outfits to get better recommendations.'
      });
    }
  };

  // Get all inspiration outfits for a user
  // GET /api/inspo
  getAllInspo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user?.id) { 
        res.status(401).json({ error: 'Unauthorized' }); 
        return; 
      }

      const inspoOutfits = await getUserInspoOutfits(user.id);
      
      if (inspoOutfits.length === 0) {
        res.status(404).json({ 
          error: 'No saved inspiration outfits found', 
          message: 'Try liking some items from the social feed to save them for inspiration.' 
        });
        return;
      }
      
      res.status(200).json(inspoOutfits.map(mapInspoOutfitForClient));
    } catch (err: any) {
      console.error('Error getting inspo outfits:', err);
      res.status(400).json({ 
        error: 'Failed to retrieve inspiration outfits',
        message: err.message || 'An unexpected error occurred'
      });
    }
  };

  // Delete an inspiration outfit
  // DELETE /api/inspo/:id
  deleteInspo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user?.id) { 
        res.status(401).json({ error: 'Unauthorized' }); 
        return; 
      }

      const { id } = req.params;
      await deleteInspoOutfit(user.id, id);
      res.status(200).json({ success: true, message: 'Inspiration outfit deleted' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

}

export default new InspoController();
