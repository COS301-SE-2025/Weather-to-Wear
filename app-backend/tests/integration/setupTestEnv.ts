import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

afterEach(async () => {
  // Delete in correct order (child tables first, then parent tables)
  await prisma.like.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();          // Add this line
  await prisma.follow.deleteMany();
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