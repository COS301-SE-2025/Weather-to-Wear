import { Router } from 'express';
import tryonSelfController from './tryon-self.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

router.post('/run', authenticateToken, tryonSelfController.run);
router.get('/credits', authenticateToken, tryonSelfController.credits);

export default router;