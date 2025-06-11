// closetService.controller.ts
import { Request, Response, NextFunction } from 'express';
import { Style, Material, Category } from '@prisma/client';
import ClosetService from './closet.service';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import closetService from './closet.service';

class ClosetController {
  uploadImage = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      res.status(400).json({ message: 'No file provided' });
      return;
    }
    try {
      const file = req.file!;
      const category = req.body.category as Category;
      const { user } = req as AuthenticatedRequest;
      if (!user || !user.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      const item = await ClosetService.saveImage(file, category, user.id);

      res.status(201).json({
        id:       item.id,
        category: item.category,
        imageUrl: `/uploads/${item.filename}`,
        createdAt:item.createdAt
      });
    } catch (err) {
      next(err);
    }
  };

  getByCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = req.params.category as Category;
      const { user } = req as AuthenticatedRequest;
      if (!user || !user.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      const items = await ClosetService.getImagesByCategory(category, user.id);
      res.status(200).json(
        items.map(i => ({
          id:       i.id,
          category: i.category,
          imageUrl: `/uploads/${i.filename}`,
          createdAt:i.createdAt
        }))
      );
    } catch (err) {
      next(err);
    }
  };

  uploadImagesBatch = async (req: Request, res: Response, next: NextFunction) => { 
    const { user } = req as AuthenticatedRequest;
    if (!user || !user.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    if (!req.files) {
      res.status(400).json({ message: 'No files provided' });
      return;
    }
    try {
      const rawCat = (req.body.category as string || '').toUpperCase();
      if (!Object.values(Category).includes(rawCat as Category)) {
        res.status(400).json({ message: `Invalid category: ${rawCat}` });
        return;
      }
      const category = rawCat as Category;
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        res.status(400).json({ message: 'No files provided' });
        return;
      }
      const items = await ClosetService.saveImagesBatch(files, category, user.id);

      res.status(201).json(
        items.map(item => ({
          id:        item.id,
          category:  item.category,
          imageUrl:  `/uploads/${item.filename}`,
          createdAt: item.createdAt
        }))
      );
    } catch (err) {
      next(err);
    }
  };

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    const { user } = req as AuthenticatedRequest;
    if (!user || !user.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    try {
      const items = await ClosetService.getAllImages(user.id);
      res.status(200).json(
        items.map(item => ({
          id:        item.id,
          category:  item.category,
          imageUrl:  `/uploads/${item.filename}`,
          createdAt: item.createdAt
        }))
      );
    } catch (err) {
      next(err);
    }
  };

    deleteItem = async (
    req: Request,
    res: Response,
    next: NextFunction
  ):Promise<void> => {
    try {
      const id = req.params.id;                 
      const { user } = req as AuthenticatedRequest;
      if (!user?.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      await ClosetService.deleteImage(id, user.id);

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  updateItem = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = req.params.id;
      const { user } = req as AuthenticatedRequest;
      if (!user?.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const { category, colorHex, warmthFactor, waterproof, style, material } = req.body;
      const updateData: any = {};
      if (category)    updateData.category    = category as Category;
      if (colorHex)    updateData.colorHex    = colorHex;
      if (warmthFactor !== undefined)
                         updateData.warmthFactor = Number(warmthFactor);
      if (waterproof !== undefined)
                         updateData.waterproof   = Boolean(waterproof);
      if (style)       updateData.style       = style as Style;
      if (material)    updateData.material    = material as Material;

      const updated = await ClosetService.updateImage(id, user.id, updateData);

      res.status(200).json({
        id:         updated.id,
        category:   updated.category,
        imageUrl:   `/uploads/${updated.filename}`,
        createdAt:  updated.createdAt,
        colorHex:   updated.colorHex,
        warmthFactor: updated.warmthFactor,
        waterproof: updated.waterproof,
        style:      updated.style,
        material:   updated.material
      });
    } catch (err) {
      next(err);
    }
  };
}

export default new ClosetController();
