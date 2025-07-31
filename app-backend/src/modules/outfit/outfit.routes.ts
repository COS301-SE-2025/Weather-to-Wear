import { Router } from 'express';
import outfitController from './outfit.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

// outfit routes
router.post('/', authenticateToken, outfitController.create);
router.get('/', authenticateToken, outfitController.getAll);
router.get('/:id', authenticateToken, outfitController.getById);
router.put('/:id', authenticateToken, outfitController.update);
router.delete('/:id', authenticateToken, outfitController.delete);

// outfit item routes
router.get('/:id/items', authenticateToken, outfitController.getItems);
router.post('/:id/items', authenticateToken, outfitController.addItem);
router.delete('/:id/items/:itemId', authenticateToken, outfitController.removeItem);

// outfit generation 
router.post('/recommend', authenticateToken, outfitController.recommend);

router.patch('/:id/favourite', authenticateToken,outfitController.toggleFavourite);

export default router;
