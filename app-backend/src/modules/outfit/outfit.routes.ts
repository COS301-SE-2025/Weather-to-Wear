import { Router } from 'express';
import outfitController from './outfit.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

router.post('/', authenticateToken, outfitController.create);

// (Add other routes later: GET, PUT, DELETE, etc.)

export default router;
