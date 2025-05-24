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


// src/modules/closet/closet.controller.ts
import { RequestHandler } from 'express';
import { Category } from '@prisma/client';
import ClosetService from './closet.service';

class ClosetController {
  uploadImage: RequestHandler = async (req, res, next) => {
    try {
      const rawCat = (req.body.category as string || '').toUpperCase();

      // 1. Validate that it's one of our enum values
      if (!Object.values(Category).includes(rawCat as Category)) {
        res.status(400).json({ message: `Invalid category: ${rawCat}` });
        return;
      }
      const category = rawCat as Category;

      // 2. Make sure Multer gave us a file
      const file = req.file;
      if (!file) {
        res.status(400).json({ message: 'No file provided' });
        return;
      }

      // 3. Delegate to the service
      const item = await ClosetService.saveImage(file, category);
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  };

  getByCategory: RequestHandler = async (req, res, next) => {
    try {
      const rawCat = (req.params.category as string || '').toUpperCase();
      if (!Object.values(Category).includes(rawCat as Category)) {
        res.status(400).json({ message: `Invalid category: ${rawCat}` });
        return;
      }
      const items = await ClosetService.getImagesByCategory(rawCat as Category);
      res.status(200).json(items);
    } catch (err) {
      next(err);
    }
  };
}

export default new ClosetController();
