//closet.route.ts
import { Router } from 'express';
import path from 'path';
import closetController from './closet.controller';
import { upload } from '../../middleware/upload.middleware';
import { authenticateToken } from '../auth/auth.middleware';
import { markPerfTest } from '../../middleware/upload.middleware'; 

const router = Router();

router.post(
  '/upload',
  authenticateToken,
  markPerfTest, 
  upload.single('image'),
  closetController.uploadImage
);

router.post(
  '/upload/batch',
  authenticateToken,
  markPerfTest, 
  upload.any(),
  closetController.uploadImagesBatch
);

router.get(
  '/category/:category',
  authenticateToken,
  closetController.getByCategory
);

router.get(
  '/all',
  authenticateToken,
  closetController.getAll
);

router.delete(
  '/:id',
  authenticateToken,
  closetController.deleteItem
);

router.patch(
  '/:id',
  authenticateToken,
  closetController.updateItem
);

router.patch(
  '/:id/favourite',
  authenticateToken,
  closetController.toggleFavourite
);


export default router;
