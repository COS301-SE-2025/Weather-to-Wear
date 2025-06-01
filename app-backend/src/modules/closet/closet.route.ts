import { Router, Request, Response } from 'express';
import path from 'path';                    
import closetController from './closet.controller';
import { upload } from '../../middleware/upload.middleware';

const router = Router();


/**
 * Single image upload endpoint
 * @route POST /upload
 * @param image - The image file to upload (multipart/form-data)
 * @returns JSON object with uploaded image details
 */
router.post(
  '/upload',
  upload.single('image'),
  closetController.uploadImage
);


/**
 * Batch image upload endpoint
 * @route POST /upload/batch
 * @param images - Array of image files (multipart/form-data, max 20)
 * @returns JSON array of uploaded image details
 */
router.post(
  '/upload/batch',
  upload.array('images', 20),
  closetController.uploadImagesBatch
);


/**
 * Get images by category endpoint
 * @route GET /category/:category
 * @param category - The category to filter by
 * @returns JSON array of matching images
 */
router.get(
  '/category/:category',
  closetController.getByCategory
);


/**
 * Get all images endpoint
 * @route GET /all
 * @returns JSON array of all closet items
 */
router.get(
  '/all',
  closetController.getAll
);

export default router;
