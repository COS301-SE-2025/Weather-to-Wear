import { Router } from 'express';
import inspoController from './inspo.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

// Like an item for inspiration
router.post('/like', authenticateToken, inspoController.likeItem);

// Generate inspiration outfits
router.post('/generate', authenticateToken, inspoController.generateOutfits);

// Get all inspiration outfits
router.get('/', authenticateToken, inspoController.getAllInspo);

// Delete inspiration outfit
router.delete('/:id', authenticateToken, inspoController.deleteInspo);

export default router;
