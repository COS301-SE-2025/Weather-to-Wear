import { RequestHandler } from 'express';
import { Category } from '@prisma/client';
import ClosetService from './closet.service';

class ClosetController {
  /**
   * Handles single image upload requests
   * @param req Express request object containing file and category
   * @param res Express response object
   * @param next Express next function
   * @returns JSON response with uploaded image details
   */
  uploadImage: RequestHandler = async (req, res, next) => {
    if (!req.file) {
      res.status(400).json({ message: 'No file provided' });
      return;
    }
    try {
      // validate...
      const file = req.file!;
      const category = req.body.category as Category;
      const item = await ClosetService.saveImage(file, category);

      // build a public URL for the front end
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


  /**
   * Retrieves images filtered by category
   * @param req Express request object containing category parameter
   * @param res Express response object
   * @param next Express next function
   * @returns JSON array of images matching the category
   */
  

  getByCategory: RequestHandler = async (req, res, next) => {
    try {
      const category = req.params.category as Category;
      const items = await ClosetService.getImagesByCategory(category);
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

  /**
   * Handles batch upload of multiple images
   * 1. Validates category
   * 2. Processes multiple files from request
   * 3. Saves images in batch
   * 4. Returns array of created items
   * 
   * @param req Express request object containing files array and category
   * @param res Express response object
   * @param next Express next function
   * @returns JSON array of created items with public URLs
   */
  uploadImagesBatch: RequestHandler = async (req, res, next) => { 
    if (!req.file) {
      res.status(400).json({ message: 'No file provided' });
      return;
    }
    try {
      // 1. Validate category
      const rawCat = (req.body.category as string || '').toUpperCase();
      if (!Object.values(Category).includes(rawCat as Category)) {
        res.status(400).json({ message: `Invalid category: ${rawCat}` });
        return;
      }
      const category = rawCat as Category;

      // 2. Multer gives us an array under req.files
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        res.status(400).json({ message: 'No files provided' });
        return;
      }

      // 3. Delegate to service
      const items = await ClosetService.saveImagesBatch(files, category);

      // 4. Return URLs for each new item
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

  /**
   * Retrieves all images from the closet
   * @param _req Express request object (unused)
   * @param res Express response object
   * @param next Express next function
   * @returns JSON array of all closet items with public URLs
   */

getAll: RequestHandler = async (_req, res, next) => {
  try {
    const items = await ClosetService.getAllImages();
    // map each record into the JSON shape your front end expects
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
}

export default new ClosetController();
