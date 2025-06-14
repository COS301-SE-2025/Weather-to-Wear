import { Router } from 'express';
import outfitController from './outfit.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

router.post('/', authenticateToken, outfitController.create);
router.get('/', authenticateToken, outfitController.getAll);
router.get('/:id', authenticateToken, outfitController.getById);


export default router;
