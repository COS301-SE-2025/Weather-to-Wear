// import { PrismaClient, ClosetItem as PrismaClosetItem, Category } from '@prisma/client';
// import { Express } from 'express';

// export type ClosetItem = PrismaClosetItem;

// class ClosetService {
//   private prisma = new PrismaClient();

//   /**
//    * Save uploaded image buffer to DB
//    */
//   async saveImage(file: Express.Multer.File, category: Category): Promise<ClosetItem> {
//     // Since your Prisma field is `Bytes`, use memoryStorage in multer so file.buffer is populated
//     const item = await this.prisma.closetItem.create({
//       data: {
//         image: file.buffer,
//         category,
//       }
//     });
//     return item;
//   }

//   /**
//    * Fetch all items matching a category
//    */
//   async getImagesByCategory(category: Category): Promise<ClosetItem[]> {
//     return this.prisma.closetItem.findMany({ where: { category } });
//   }
// }

// export default new ClosetService();


import { PrismaClient, ClosetItem as PrismaClosetItem, Category } from '@prisma/client';
import { Express } from 'express';
import { Multer } from 'multer';


export type ClosetItem = PrismaClosetItem;

class ClosetService {
  private prisma = new PrismaClient();

  async saveImage(file: Express.Multer.File, category: Category): Promise<ClosetItem> {
    return this.prisma.closetItem.create({
      data: {
        filename: file.filename,
        category
      }
    });
  }

  async getImagesByCategory(category: Category): Promise<ClosetItem[]> {
    return this.prisma.closetItem.findMany({ where: { category } });
  }

  async saveImagesBatch(
    files: Express.Multer.File[],
    category: Category
  ): Promise<ClosetItem[]> {
    // Option A: loop and create one by one
    const creations = files.map(file =>
      this.prisma.closetItem.create({
        data: { filename: file.filename, category }
      })
    );
    return Promise.all(creations);
  }

  async getAllImages(): Promise<ClosetItem[]> {
  return this.prisma.closetItem.findMany();
  }
}

export default new ClosetService();