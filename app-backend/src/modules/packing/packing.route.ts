import { Router } from 'express';
import { authenticateToken } from '../auth/auth.middleware';
import * as packingController from './packing.controller';

const router = Router();

router.post('/', authenticateToken, packingController.createPackingList);
router.get('/:tripId', authenticateToken, packingController.getPackingList);
router.put('/:listId', authenticateToken, packingController.updatePackingList);
router.delete('/:listId', authenticateToken, packingController.deletePackingList);

export default router;
