import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Integration: User model', () => {
  it('creates a user', async () => {
    const user = await prisma.user.create({
      data: {
        name: "Test User",
        email: "testuser@example.com",
        password: "hashedpassword",
      }
    });
    expect(user.email).toBe("testuser@example.com");
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
