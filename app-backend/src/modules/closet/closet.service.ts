import { PrismaClient, ClosetItem as PrismaClosetItem, Category } from '@prisma/client';
import { Express } from 'express';
import { Multer } from 'multer';


export type ClosetItem = PrismaClosetItem;

class ClosetService {
  private prisma = new PrismaClient();

  /**
   * Saves a single uploaded image to the database
   * @param file - The uploaded file from multer middleware
   * @param category - The category of the clothing item
   * @returns Promise resolving to the created closet item
   */
  async saveImage(file: Express.Multer.File, category: Category): Promise<ClosetItem> {
    return this.prisma.closetItem.create({
      data: {
        filename: file.filename,
        category
      }
    });
  }

  /**
   * Retrieves all images matching a specific category
   * @param category - The category to filter by
   * @returns Promise resolving to an array of matching closet items
   */
  async getImagesByCategory(category: Category): Promise<ClosetItem[]> {
    return this.prisma.closetItem.findMany({ where: { category } });
  }

  /**
   * Saves multiple images in a batch operation
   * @param files - Array of uploaded files from multer middleware
   * @param category - The category for all uploaded items
   * @returns Promise resolving to an array of created closet items
   */
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

  /**
   * Retrieves all images from the closet
   * @returns Promise resolving to an array of all closet items
   */
  async getAllImages(): Promise<ClosetItem[]> {
  return this.prisma.closetItem.findMany();
  }
}

export default new ClosetService();