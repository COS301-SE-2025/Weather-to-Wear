import { Request, Response, NextFunction } from 'express';
import ClothingService from './clothing.service';

export default class ClothingController {
  // note the explicit Promise<void> return type
  static async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { category } = req.body;
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'Image file is required.' });
        return;      // <-- early return, no value
      }
      if (!category) {
        res.status(400).json({ error: 'Category is required.' });
        return;      // <-- early return, no value
      }

      const item = await ClothingService.create({
        imagePath: file.filename,
        category,
      });

      res.status(201).json(item);  // <-- no `return` here
    } catch (err) {
      next(err);                    // <-- no `return` here either
    }
  }
}
