// app-backend/src/modules/tryon-self/tryon-self.routes.ts
import { Router } from 'express';
import tryonSelfController from './tryon-self.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

router.post('/run', authenticateToken, tryonSelfController.run);
router.get('/credits', authenticateToken, tryonSelfController.credits);

// Manage try on photos
router.post('/photo', authenticateToken, tryonSelfController.setPhoto);
router.get('/photo', authenticateToken, tryonSelfController.getPhoto);
router.delete('/photo', authenticateToken, tryonSelfController.deletePhoto);

// cache try-on result for an outfit
router.get('/result/:outfitId', authenticateToken, tryonSelfController.getResult);
router.delete('/result/:outfitId', authenticateToken, tryonSelfController.deleteResult);

export default router;
