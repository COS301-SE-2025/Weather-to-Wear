import { PrismaClient } from "@prisma/client";

// Mock S3 functions for integration tests
jest.mock('../../src/utils/s3', () => ({
  uploadBufferToS3: jest.fn().mockResolvedValue({ key: 'mock-key' }),
  deleteFromS3: jest.fn().mockResolvedValue(undefined),
  cdnUrlFor: (k: string) => `https://cdn.test/${k}`,
  putBufferSmart: jest.fn().mockImplementation(({ key }: { key: string }) => {
    return Promise.resolve({
      key: key || 'mock-key',
      publicUrl: `https://cdn.test/${key || 'mock-key'}`
    });
  }),
}));

const prisma = new PrismaClient();

afterEach(async () => {
  // Delete in correct order (child tables first, then parent tables)
  await prisma.postItem.deleteMany();     // New table for post-clothing associations
  await prisma.like.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.packingOther.deleteMany(); // Packing other items
  await prisma.packingOutfit.deleteMany(); // Packing outfit items
  await prisma.packingItem.deleteMany(); // Packing items
  await prisma.packingList.deleteMany(); // Packing list
  await prisma.daySelection.deleteMany(); // Day selections (must come before users)
  
  // Inspo items (must come before closet items and inspo outfits)
  await prisma.inspoItem.deleteMany();
  await prisma.inspoOutfit.deleteMany();
  
  await prisma.outfitItem.deleteMany();
  await prisma.outfit.deleteMany();
  await prisma.closetItem.deleteMany();
  await prisma.event.deleteMany();
  await prisma.userPreference.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});