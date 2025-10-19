import { Router } from 'express';
import shoppingController from './shopping.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

// Get current API usage stats
router.get('/usage-stats', authenticateToken, shoppingController.getUsageStats);
// Find purchase options with quota protection
router.post('/item/:itemId/purchase-options', authenticateToken, shoppingController.findPurchaseOptions);
// Debug endpoints
router.get('/debug/item/:itemId', authenticateToken, shoppingController.debugGetItem);
router.get('/debug/color-mapping', authenticateToken, shoppingController.debugColorMapping);

export default router;
