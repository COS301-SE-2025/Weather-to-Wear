import { PrismaClient, ClosetItem as PrismaClosetItem, Category } from '@prisma/client';
import { Express } from 'express';
import { Multer } from 'multer';


export type ClosetItem = PrismaClosetItem;

class ClosetService {
  private prisma = new PrismaClient();

  async saveImage(file: Express.Multer.File, category: Category, userId: string): Promise<ClosetItem> {
    return this.prisma.closetItem.create({
      data: {
        filename: file.filename,
        category,
        ownerId: userId,
      }
    });
  }

  async getImagesByCategory(category: Category, userId: string): Promise<ClosetItem[]> {
    return this.prisma.closetItem.findMany({
      where: { category, ownerId: userId }
    });
  }

  async saveImagesBatch(
    files: Express.Multer.File[],
    category: Category,
    userId: string
  ): Promise<ClosetItem[]> {
    const creations = files.map(file =>
      this.prisma.closetItem.create({
        data: { filename: file.filename, category, ownerId: userId }
      })
    );
    return Promise.all(creations);
  }

  async getAllImages(userId: string): Promise<ClosetItem[]> {
    return this.prisma.closetItem.findMany({
      where: { ownerId: userId }
    });
  }
}

export default new ClosetService();