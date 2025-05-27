// // import { Request, Response, NextFunction } from 'express';
// // import ClosetService from './closet.service';

// // class ClosetController {
// //   /** POST /api/closet/upload */
// //   async uploadImage(req: Request, res: Response, next: NextFunction) {
// //     try {
// //       const { category } = req.body;
// //       const file = req.file;
// //       if (!file) {
// //         return res.status(400).json({ message: 'No file provided' });
// //       }
// //       const image = await ClosetService.saveImage(file, category);
// //       return res.status(201).json(image);
// //     } catch (error) {
// //       next(error);
// //     }
// //   }

// //   /** GET /api/closet/category/:category */
// //   async getByCategory(req: Request, res: Response, next: NextFunction) {
// //     try {
// //       const { category } = req.params;
// //       const items = await ClosetService.getImagesByCategory(category);
// //       return res.status(200).json(items);
// //     } catch (error) {
// //       next(error);
// //     }
// //   }
// // }

// // export default new ClosetController();

// // src/modules/closet/closet.controller.ts
// import { RequestHandler } from 'express';
// import ClosetService from './closet.service';

// class ClosetController {
//   // now TS knows this is a valid RequestHandler
//   uploadImage: RequestHandler = async (req, res, next) => {
//     try {
//       const { category } = req.body;
//       const file = req.file;
//       if (!file) {
//         res.status(400).json({ message: 'No file provided' });
//         return;
//       }
//       const image = await ClosetService.saveImage(file, category);
//       res.status(201).json(image);
//     } catch (err) {
//       next(err);
//     }
//   };

//   getByCategory: RequestHandler = async (req, res, next) => {
//     try {
//       const { category } = req.params;
//       const items = await ClosetService.getImagesByCategory(category);
//       res.status(200).json(items);
//     } catch (err) {
//       next(err);
//     }
//   };
// }

// export default new ClosetController();


import { RequestHandler } from 'express';
import { Category } from '@prisma/client';
import ClosetService from './closet.service';

class ClosetController {
  uploadImage: RequestHandler = async (req, res, next) => {
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

  uploadImagesBatch: RequestHandler = async (req, res, next) => {
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
