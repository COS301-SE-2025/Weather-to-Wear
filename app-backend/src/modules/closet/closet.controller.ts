// closetService.controller.ts
import { Request, Response, NextFunction } from 'express';
import { Style, Material, Category, LayerCategory } from '@prisma/client';
import ClosetService from './closet.service';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import closetService from './closet.service';
import { cdnUrlFor } from '../../utils/s3';

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
      if (!user?.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const extras = {
        colorHex: req.body.colorHex,
        warmthFactor: req.body.warmthFactor ? Number(req.body.warmthFactor) : undefined,
        waterproof: req.body.waterproof !== undefined
          ? req.body.waterproof === 'true'
          : undefined,
        style: req.body.style as Style,
        material: req.body.material as Material,
      };

      const layerCategory = req.body.layerCategory as LayerCategory;

      const item = await ClosetService.saveImage(file, category, layerCategory, user.id, extras);

      res.status(201).json({
        id: item.id,
        category: item.category,
        imageUrl: cdnUrlFor(item.filename),
        createdAt: item.createdAt,
        colorHex: item.colorHex,
        warmthFactor: item.warmthFactor,
        waterproof: item.waterproof,
        style: item.style,
        material: item.material,
      });
    } catch (err) {
      next(err);
    }
  };

  getByCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = req.params.category as Category;
      const { user } = req as AuthenticatedRequest;
      if (!user?.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      const items = await ClosetService.getImagesByCategory(category, user.id);

      res.status(200).json(
        items.map(i => ({
          id: i.id,
          category: i.category,
          imageUrl: cdnUrlFor(i.filename),
          createdAt: i.createdAt,
          colorHex: i.colorHex,
          dominantColors: i.dominantColors ?? [],
          warmthFactor: i.warmthFactor,
          waterproof: i.waterproof,
          style: i.style,
          material: i.material,
          favourite: i.favourite,
        }))
      );
    } catch (err) {
      next(err);
    }
  };

  uploadImagesBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { user } = req as AuthenticatedRequest;
    const files = req.files as Express.Multer.File[];

    if (!user?.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    try {
      const itemsJson = req.body.items;
      if (!itemsJson) {
        res.status(400).json({ message: 'Missing "items" field in body' });
        return;
      }

      const parsed = JSON.parse(itemsJson);
      if (!Array.isArray(parsed)) {
        res.status(400).json({ message: '"items" must be a JSON array' });
        return;
      }

      const results: Array<any> = [];

      for (const item of parsed) {
        const {
          category,
          layerCategory,
          colorHex,
          warmthFactor,
          waterproof,
          style,
          material,
          filename // refers to the key of the file field
        } = item;

        const file = files.find(f => f.fieldname === filename);
        if (!file) {
          res.status(400).json({ message: `Missing file for ${filename}` });
          return;
        }

        const saved = await ClosetService.saveImage(
          file,
          category as Category,
          layerCategory as LayerCategory,
          user.id,
          {
            colorHex,
            warmthFactor: warmthFactor !== undefined ? Number(warmthFactor) : undefined,
            waterproof: waterproof !== undefined
              ? (waterproof === true || waterproof === 'true')
              : undefined,
            style,
            material
          }
        );

        results.push({
          id: saved.id,
          category: saved.category,
          imageUrl: cdnUrlFor(saved.filename),
          createdAt: saved.createdAt,
          colorHex: saved.colorHex,
          warmthFactor: saved.warmthFactor,
          waterproof: saved.waterproof,
          style: saved.style,
          material: saved.material,
        });
      }

      res.status(201).json(results);
    } catch (err) {
      next(err);
    }
  };

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    const { user } = req as AuthenticatedRequest;
    if (!user?.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    try {
      const items = await ClosetService.getAllImages(user.id);
      res.status(200).json(
        items.map(i => ({
          id: i.id,
          category: i.category,
          layerCategory: i.layerCategory,
          imageUrl: cdnUrlFor(i.filename),
          createdAt: i.createdAt,
          colorHex: i.colorHex,
          dominantColors: i.dominantColors ?? [],
          warmthFactor: i.warmthFactor,
          waterproof: i.waterproof,
          style: i.style,
          material: i.material,
          favourite: i.favourite,
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
  ): Promise<void> => {
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

      const { category, layerCategory, colorHex, warmthFactor, waterproof, style, material } = req.body;
      const updateData: any = {};
      if (category)
        updateData.category = category as Category;
      if (colorHex)
        updateData.colorHex = colorHex;
      if (warmthFactor !== undefined)
        updateData.warmthFactor = Number(warmthFactor);
      if (waterproof !== undefined)
        updateData.waterproof = Boolean(waterproof);
      if (style)
        updateData.style = style as Style;
      if (material)
        updateData.material = material as Material;
      if (layerCategory)
        updateData.layerCategory = layerCategory as any;

      const updated = await ClosetService.updateImage(id, user.id, updateData);

      res.status(200).json({
        id: updated.id,
        category: updated.category,
        // imageUrl: `/uploads/${updated.filename}`,
        imageUrl: cdnUrlFor(updated.filename),
        createdAt: updated.createdAt,
        colorHex: updated.colorHex,
        warmthFactor: updated.warmthFactor,
        waterproof: updated.waterproof,
        style: updated.style,
        material: updated.material
      });
    } catch (err) {
      next(err);
    }
  };

  toggleFavourite = async (
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

      const updated = await ClosetService.toggleFavourite(id, user.id);
      res.status(200).json({
        id: updated.id,
        favourite: updated.favourite,
      });
    } catch (err) {
      next(err);
    }
  };

}

export default new ClosetController();
