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

export default router;
