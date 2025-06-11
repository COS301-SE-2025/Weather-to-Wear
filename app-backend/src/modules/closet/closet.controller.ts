// closetService.controller.ts
import { Request, Response, NextFunction } from 'express';
import { Category } from '@prisma/client';
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
      const id = req.params.id;                       // it's a string
      const { user } = req as AuthenticatedRequest;
      if (!user?.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      await ClosetService.deleteImage(id, user.id);

      // 204 No Content for a successful delete
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}

export default new ClosetController();
