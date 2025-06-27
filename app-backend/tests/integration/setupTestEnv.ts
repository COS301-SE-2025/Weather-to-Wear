// app-backend/tests/integration/setupTestEnv.ts

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

afterEach(async () => {
  await prisma.outfitItem.deleteMany();
  await prisma.outfit.deleteMany();
  await prisma.closetItem.deleteMany();
  await prisma.event.deleteMany();
  await prisma.userPreference.deleteMany();
  await prisma.user.deleteMany();
  // Add others as needed (in correct order for your schema)
});

afterAll(async () => {
  await prisma.$disconnect();
});
