import { Router } from 'express';
import { upload } from './upload.middleware';
import ClothingController from './clothing.controller';

const router = Router();

// POST /api/clothing
// expects multipart/form-data: { image: File, category: string }
router.post('/', upload.single('image'), ClothingController.create);

export default router;

