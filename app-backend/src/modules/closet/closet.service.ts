import { Category, Style, Material, PrismaClient, ClosetItem as PrismaClosetItem } from '@prisma/client';

import path from 'path';
import fs from 'fs';
import { Express } from 'express';
import { Multer } from 'multer';


export type ClosetItem = PrismaClosetItem;

type UpdateData = {
  category?: Category;
  colorHex?: string;
  warmthFactor?: number;
  waterproof?: boolean;
  style?: Style;
  material?: Material;
};

type Extras = {
  colorHex?: string;
  warmthFactor?: number;
  waterproof?: boolean;
  style?: Style;
  material?: Material;
};

class ClosetService {
  private prisma = new PrismaClient();

  async saveImage(
      file: Express.Multer.File,
      category: Category,
      userId: string,
      extras?: Extras
    ): Promise<ClosetItem> {
      return this.prisma.closetItem.create({
        data: {
          filename: file.filename,
          category,
          ownerId: userId,
          ...extras,
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
    userId: string,
    extras?: Extras
  ): Promise<ClosetItem[]> {
    const creations = files.map(file =>
      this.prisma.closetItem.create({
        data: {
          filename: file.filename,
          category,
          ownerId: userId,
          ...extras,
        }
      })
    );
    return Promise.all(creations);
  }

  async getAllImages(userId: string): Promise<ClosetItem[]> {
    return this.prisma.closetItem.findMany({
      where: { ownerId: userId }
    });
  }


async deleteImage(id: string, ownerId: string): Promise<void> {
    const item = await this.prisma.closetItem.findFirst({
      where: { id, ownerId }
    });
    if (!item) {
      const err = new Error('Item not found');
      throw err;
    }

    await this.prisma.closetItem.delete({
      where: { id }
    });

    const uploadDir = path.join(__dirname, '../../uploads');
    const filePath  = path.join(uploadDir, item.filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async updateImage(
    id: string,
    ownerId: string,
    data: UpdateData
  ): Promise<ClosetItem> {
    const existing = await this.prisma.closetItem.findFirst({
      where: { id, ownerId }
    });
    if (!existing) {
      throw new Error('Item not found');
    }

    return this.prisma.closetItem.update({
      where: { id },
      data
    });
  }
}

export default new ClosetService();