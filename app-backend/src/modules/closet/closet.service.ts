import { Category, LayerCategory, Style, Material, PrismaClient, ClosetItem as PrismaClosetItem } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { Express } from 'express';
import axios from 'axios';
import FormData from 'form-data';

import { randomUUID } from 'crypto';
import { uploadBufferToS3, cdnUrlFor, deleteFromS3 } from '../../utils/s3';

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

  // Save a single image with background removal via microservice
  //   async saveImage(
  //   file: Express.Multer.File,
  //   category: Category,
  //   layerCategory: LayerCategory,
  //   userId: string,
  //   extras?: Extras
  // ): Promise<ClosetItem> {
  //   const originalImagePath = file.path;
  //   const outputImagePath = originalImagePath.replace(/\.(jpg|jpeg|png)$/, '_no_bg.png');

  //   // Prepare form for background removal microservice
  //   const form = new FormData();
  //   form.append('file', fs.createReadStream(originalImagePath));

  //   try {
  //     const response = await axios.post(
  //       process.env.BG_REMOVAL_URL!,
  //       form,
  //       {
  //         headers: form.getHeaders(),
  //         responseType: 'arraybuffer',
  //       }
  //     );
  //     fs.writeFileSync(outputImagePath, Buffer.from(response.data));
  //   } catch (err) {
  //     console.error('Background removal error:', err);
  //     throw new Error('Failed to remove background from image');
  //   }

  //   // Clean up original file
  //   fs.unlinkSync(originalImagePath);

  //  // 🟡 NEW: Extract top 3 colors using microservice
  //   let dominantColors: string[] = [];

  //   try {
  //     const colorForm = new FormData();
  //     colorForm.append('file', fs.createReadStream(outputImagePath));

  //     const colorRes = await axios.post(
  //       process.env.COLOR_EXTRACT_URL!,
  //       colorForm,
  //       {
  //         headers: colorForm.getHeaders(),
  //       }
  //     );

  //     dominantColors = colorRes.data.colors;
  //   } catch (err) {
  //     console.error('Color extraction error:', err);
  //     dominantColors = []; // Graceful fallback
  //   }

  //   const cleanedFilename = path.basename(outputImagePath);

  //   return this.prisma.closetItem.create({
  //     data: {
  //       filename: cleanedFilename,
  //       category,
  //       layerCategory,
  //       ownerId: userId,
  //       colorHex: dominantColors[0] ?? null,
  //       dominantColors,
  //       ...extras,
  //     }
  //   });
  // }

  // upload hosting
  async saveImage(
    file: Express.Multer.File,
    category: Category,
    layerCategory: LayerCategory,
    userId: string,
    extras?: Extras
  ): Promise<ClosetItem> {
    // 1) send original buffer to BG Removal service
    const form = new FormData();
    form.append('file', file.buffer, { filename: file.originalname, contentType: file.mimetype });

    const bgRes = await axios.post(process.env.BG_REMOVAL_URL!, form, {
      headers: form.getHeaders(),
      responseType: 'arraybuffer',
      maxBodyLength: Infinity,
    });
    const noBgBuffer = Buffer.from(bgRes.data);

    // 2) color extraction from the no‑bg buffer
    let dominantColors: string[] = [];
    try {
      const colorForm = new FormData();
      colorForm.append('file', noBgBuffer, { filename: 'item.png', contentType: 'image/png' });
      const colorRes = await axios.post(process.env.COLOR_EXTRACT_URL!, colorForm, {
        headers: colorForm.getHeaders(),
        timeout: 30_000,
      });
      dominantColors = colorRes.data.colors ?? [];
    } catch (e) {
      console.error('Color extraction error:', e);
    }

    // 3) upload processed image to S3 as PNG
    const key = `users/${userId}/${Date.now()}-${randomUUID()}.png`;
    await uploadBufferToS3({
      bucket: process.env.S3_BUCKET_NAME!,
      key,
      contentType: 'image/png',
      body: noBgBuffer,
    });

    // 4) store only the S3 key in DB (filename field is key)
    return this.prisma.closetItem.create({
      data: {
        filename: key,
        category,
        layerCategory,
        ownerId: userId,
        colorHex: dominantColors[0] ?? null,
        dominantColors,
        ...extras,
      },
    });
  }


  // Save multiple images with background removal via microservice
  // async saveImagesBatch(
  //   files: Express.Multer.File[],
  //   category: Category,
  //   layerCategory: LayerCategory,
  //   userId: string,
  //   extras?: Extras
  // ): Promise<ClosetItem[]> {
  //   const savedItems: ClosetItem[] = [];

  //   for (const file of files) {
  //     const originalImagePath = file.path;
  //     const outputImagePath = originalImagePath.replace(/\.(jpg|jpeg|png)$/, '_no_bg.png');

  //     const form = new FormData();
  //     form.append('file', fs.createReadStream(originalImagePath));

  //     try {
  //       const response = await axios.post(
  //         process.env.BG_REMOVAL_URL!,
  //         form,
  //         {
  //           headers: form.getHeaders(),
  //           responseType: 'arraybuffer',
  //         }
  //       );
  //       fs.writeFileSync(outputImagePath, Buffer.from(response.data));
  //     } catch (err) {
  //       console.error('Background removal error for batch item:', err);
  //       throw new Error('Failed to remove background from one of the images');
  //     }

  //     fs.unlinkSync(originalImagePath);
  //     const cleanedFilename = path.basename(outputImagePath);

  //     const item = await this.prisma.closetItem.create({
  //       data: {
  //         filename: cleanedFilename,
  //         category,
  //         layerCategory,
  //         ownerId: userId,
  //         ...extras,
  //       }
  //     });
  //     savedItems.push(item);
  //   }

  //   return savedItems;
  // }

  // Hosted saveImagesBatch
  async saveImagesBatch(
    files: Express.Multer.File[],
    category: Category,
    layerCategory: LayerCategory,
    userId: string,
    extras?: Extras
  ): Promise<ClosetItem[]> {
    const results: ClosetItem[] = [];
    for (const file of files) {
      const item = await this.saveImage(file, category, layerCategory, userId, extras);
      results.push(item);
    }
    return results;
  }

  async getImagesByCategory(category: Category, userId: string): Promise<ClosetItem[]> {
    return this.prisma.closetItem.findMany({
      where: { category, ownerId: userId }
    });
  }

  async getAllImages(userId: string): Promise<ClosetItem[]> {
    return this.prisma.closetItem.findMany({
      where: { ownerId: userId }
    });
  }

  // async deleteImage(id: string, ownerId: string): Promise<void> {
  //   const item = await this.prisma.closetItem.findFirst({
  //     where: { id, ownerId }
  //   });
  //   if (!item) throw new Error('Item not found');

  //   await this.prisma.closetItem.delete({ where: { id } });

  //   const uploadDir = path.join(__dirname, '../../uploads');
  //   const filePath = path.join(uploadDir, item.filename);
  //   if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  // }

  // hosted delete
  async deleteImage(id: string, ownerId: string): Promise<void> {
    const item = await this.prisma.closetItem.findFirst({ where: { id, ownerId } });
    if (!item) throw new Error('Item not found');

    await this.prisma.closetItem.delete({ where: { id } });

    // also delete image from S3 (best-effort)
    try { await deleteFromS3(process.env.S3_BUCKET_NAME!, item.filename); } catch { }
  }

  async updateImage(
    id: string,
    ownerId: string,
    data: UpdateData
  ): Promise<ClosetItem> {
    const existing = await this.prisma.closetItem.findFirst({
      where: { id, ownerId }
    });
    if (!existing) throw new Error('Item not found');

    return this.prisma.closetItem.update({ where: { id }, data });
  }

  async toggleFavourite(id: string, ownerId: string): Promise<ClosetItem> {
    const existing = await this.prisma.closetItem.findFirst({
      where: { id, ownerId },
    });
    if (!existing) throw new Error('Item not found');

    return this.prisma.closetItem.update({
      where: { id },
      data: { favourite: !existing.favourite },
    });
  }
}

export default new ClosetService();
