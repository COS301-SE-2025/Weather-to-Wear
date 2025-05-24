// src/modules/closet/closet.routes.ts
import { Router } from 'express';
import closetController from './closet.controller';
import { upload } from '../../middleware/upload.middleware';

const router = Router();

// POST /api/closet/upload
router.post(
  '/upload',
  upload.single('image'),
  closetController.uploadImage
);

// GET /api/closet/category/:category
router.get(
  '/category/:category',
  closetController.getByCategory
);

export default router;
