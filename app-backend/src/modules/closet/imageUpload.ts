import { Router } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

// POST /upload-image
router.post('/upload-image', upload.single('image'), async (req, res): Promise<void> => {
    // debug purposes
    console.log('Start here...');
    console.log('Received file:', req.file);
    //---------------------
    
  if (!req.file) {
    res.status(400).json({ error: 'No image uploaded' });
    return;
  }

  try {
    const saved = await prisma.clothingImage.create({
      data: {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        imageData: req.file.buffer,
        category: req.body.category,
      },
    });

    res.status(201).json({ id: saved.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error saving image' });
  }
});

export default router;
