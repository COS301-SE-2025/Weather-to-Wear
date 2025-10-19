import { Router } from 'express';
import shoppingController from './shopping.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

// Get current API usage stats
router.get('/usage-stats', authenticateToken, shoppingController.getUsageStats);
// Find purchase options with quota protection
router.post('/item/:itemId/purchase-options', authenticateToken, shoppingController.findPurchaseOptions);

export default router;
