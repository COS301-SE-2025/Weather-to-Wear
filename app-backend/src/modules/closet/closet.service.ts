import { Category, LayerCategory, Style, Material, PrismaClient, ClosetItem as PrismaClosetItem } from '@prisma/client';

import path from 'path';
import fs from 'fs';
import { Express } from 'express';
import { Multer } from 'multer';
import { spawnSync } from 'child_process';



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
  layerCategory: any,
  userId: string,
  extras?: Extras
): Promise<ClosetItem> {
  const originalImagePath = file.path;
  const outputImagePath = originalImagePath.replace(/\.(jpg|jpeg|png)$/, '_no_bg.png');

  // const result = spawnSync('python3', [
  //   // path.join(__dirname, '../../../scripts/background-removal/U-2-Net/remove_bg.py'),
  //   path.join(__dirname, '/app/scripts/background-removal/U-2-Net/remove_bg.py'),

  //   originalImagePath,
  //   outputImagePath
  // ]);

  const result = spawnSync('python3', [
    '/app/scripts/background-removal/U-2-Net/remove_bg.py',
    originalImagePath,
    outputImagePath
  ]);

  // debug code
  if (result.error || result.status !== 0) {
    console.error('Background removal failed');
    console.error('Exit code:', result.status);
    console.error('STDOUT:', result.stdout?.toString());
    console.error('STDERR:', result.stderr?.toString());
    console.error('Error:', result.error);
    throw new Error('Image background removal failed');
  }

  // clears up disk space
  fs.unlinkSync(originalImagePath);

  const cleanedFilename = path.basename(outputImagePath);

  return this.prisma.closetItem.create({
    data: {
      filename: cleanedFilename,
      category,
      layerCategory,
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
    layerCategory: any,
    userId: string,
    extras?: Extras
  ): Promise<ClosetItem[]> {
    const creations = files.map(file =>
      this.prisma.closetItem.create({
        data: {
          filename: file.filename,
          category,
          layerCategory,
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

    async toggleFavourite(id: string, ownerId: string): Promise<ClosetItem> {
    const existing = await this.prisma.closetItem.findFirst({
      where: { id, ownerId },
    });
    if (!existing) {
      throw new Error('Item not found');
    }
    return this.prisma.closetItem.update({
      where: { id },
      data: { favourite: !existing.favourite },
    });
  }

}



export default new ClosetService();