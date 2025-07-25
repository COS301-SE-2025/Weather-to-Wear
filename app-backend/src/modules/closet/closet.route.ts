//closet.route.ts
import { Router } from 'express';
import path from 'path';
import closetController from './closet.controller';
import { upload } from '../../middleware/upload.middleware';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

// protect all closet endpoints with authentication
router.post(
  '/upload',
  authenticateToken,
  upload.single('image'),
  closetController.uploadImage
);

router.post(
  '/upload/batch',
  authenticateToken,
  upload.array('images', 20),
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
