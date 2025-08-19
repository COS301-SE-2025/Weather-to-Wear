import {
  Category,
  LayerCategory,
  Style,
  Material,
  PrismaClient,
  ClosetItem as PrismaClosetItem,
} from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { Express } from 'express';
import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import { uploadBufferToS3 } from '../../utils/s3';

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

function streamFromFileOrBuffer(file: Express.Multer.File): {
  stream: NodeJS.ReadableStream;
  filename: string;
  contentType: string;
} {
  const filename = file.originalname || `upload-${Date.now()}`;
  const contentType = file.mimetype || 'application/octet-stream';

  if (file.buffer && file.buffer.length > 0) {
    return { stream: Readable.from(file.buffer), filename, contentType };
  }
  if (file.path) {
    return { stream: fs.createReadStream(file.path), filename, contentType };
  }
  throw new Error('No file content provided.');
}

class ClosetService {
  private prisma = new PrismaClient();

  // Save a single image with background removal via microservice, color extraction, then upload to S3
  async saveImage(
    file: Express.Multer.File,
    category: Category,
    layerCategory: LayerCategory,
    userId: string,
    extras?: Extras
  ): Promise<ClosetItem> {
    if (!process.env.BG_REMOVAL_URL || !process.env.COLOR_EXTRACT_URL) {
      throw new Error('BG_REMOVAL_URL or COLOR_EXTRACT_URL not configured');
    }
    if (!process.env.S3_BUCKET_NAME || !process.env.S3_REGION) {
      throw new Error('S3_BUCKET_NAME or S3_REGION not configured');
    }

    // 1) Send original to bg-removal microservice
    const { stream, filename, contentType } = streamFromFileOrBuffer(file);
    const form = new FormData();
    form.append('file', stream as any, { filename, contentType });

    let noBgBuffer: Buffer;
    try {
      const resp = await axios.post(process.env.BG_REMOVAL_URL, form, {
        headers: form.getHeaders(),
        responseType: 'arraybuffer',
      });
      noBgBuffer = Buffer.from(resp.data);
    } catch (err) {
      console.error('Background removal error:', err);
      throw new Error('Failed to remove background from image');
    } finally {
      // clean up disk file if used
      if (file.path) {
        try {
          fs.unlinkSync(file.path);
        } catch {}
      }
    }

    // 2) Color extraction on the processed buffer
    let dominantColors: string[] = [];
    try {
      const colorForm = new FormData();
      colorForm.append('file', Readable.from(noBgBuffer) as any, {
        filename: 'image.png',
        contentType: 'image/png',
      });
      const colorRes = await axios.post(process.env.COLOR_EXTRACT_URL, colorForm, {
        headers: colorForm.getHeaders(),
      });
      const maybe = colorRes.data?.colors;
      dominantColors = Array.isArray(maybe) ? maybe : [];
    } catch (err) {
      console.error('Color extraction error:', err);
      dominantColors = [];
    }

    // 3) Upload final PNG (no-bg) to S3
    const key = `users/${userId}/closet/${Date.now()}-${randomUUID()}.png`;
    await uploadBufferToS3({
      bucket: process.env.S3_BUCKET_NAME!,
      key,
      contentType: 'image/png',
      body: noBgBuffer,
      cacheControl: 'public, max-age=31536000, immutable',
    });

    // 4) Persist record (store S3 key in "filename")
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

  // Batch -> just call saveImage for each file
  async saveImagesBatch(
    files: Express.Multer.File[],
    category: Category,
    layerCategory: LayerCategory,
    userId: string,
    extras?: Extras
  ): Promise<ClosetItem[]> {
    const results: ClosetItem[] = [];
    for (const f of files) {
      const item = await this.saveImage(f, category, layerCategory, userId, extras);
      results.push(item);
    }
    return results;
  }

  async getImagesByCategory(category: Category, userId: string): Promise<ClosetItem[]> {
    return this.prisma.closetItem.findMany({
      where: { category, ownerId: userId },
    });
  }

  async getAllImages(userId: string): Promise<ClosetItem[]> {
    return this.prisma.closetItem.findMany({
      where: { ownerId: userId },
    });
  }

  async deleteImage(id: string, ownerId: string): Promise<void> {
    const item = await this.prisma.closetItem.findFirst({
      where: { id, ownerId },
    });
    if (!item) throw new Error('Item not found');

    await this.prisma.closetItem.delete({ where: { id } });

    // Optional: if you later store S3 keys in `filename`, you might also delete from S3 here.
    // For now, we leave S3 garbage-collection as a future enhancement.
    const uploadDir = path.join(__dirname, '../../uploads');
    const filePath = path.join(uploadDir, item.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  async updateImage(id: string, ownerId: string, data: UpdateData): Promise<ClosetItem> {
    const existing = await this.prisma.closetItem.findFirst({
      where: { id, ownerId },
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
