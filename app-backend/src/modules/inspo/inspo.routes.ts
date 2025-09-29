import { Router } from 'express';
import inspoController from './inspo.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

router.post('/like', authenticateToken, inspoController.likeItem);

router.post('/generate', authenticateToken, inspoController.generateOutfits);

router.get('/', authenticateToken, inspoController.getAllInspo);

router.delete('/:id', authenticateToken, inspoController.deleteInspo);

export default router;
