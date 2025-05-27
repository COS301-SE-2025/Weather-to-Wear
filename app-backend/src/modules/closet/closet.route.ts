// src/modules/closet/closet.routes.ts
import { Router, Request, Response } from 'express';
import path from 'path';                      // ← for showing absolute paths
import closetController from './closet.controller';
import { upload } from '../../middleware/upload.middleware';

const router = Router();


// POST /api/closet/upload
router.post(
  '/upload',
  upload.single('image'),
  closetController.uploadImage
);

// POST /api/closet/upload/batch
router.post(
  '/upload/batch',
  upload.array('images', 20),
  closetController.uploadImagesBatch
);

// GET /api/closet/category/:category
router.get(
  '/category/:category',
  closetController.getByCategory
);

// GET /api/closet/all
router.get(
  '/all',
  closetController.getAll
);

export default router;
