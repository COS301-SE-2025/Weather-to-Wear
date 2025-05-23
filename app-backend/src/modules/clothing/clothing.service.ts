import { PrismaClient, Category } from '@prisma/client';
const prisma = new PrismaClient();

interface CreateDto {
  imagePath: string;
  category: string;
}

export default class ClothingService {
  static async create({ imagePath, category }: CreateDto) {
    // ensure category maps to our enum
    const enumKey = category.toUpperCase() as keyof typeof Category;
    if (!Category[enumKey]) {
      throw new Error(`Invalid category. Must be one of: ${Object.keys(Category).join(', ')}`);
    }
    return prisma.clothing.create({
      data: {
        imagePath,
        category: enumKey,
      },
    });
  }
}
