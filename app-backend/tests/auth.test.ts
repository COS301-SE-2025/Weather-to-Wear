// import request from 'supertest';
// import app from '../src/app';
import { PrismaClient } from '@prisma/client';
// import { execSync } from 'child_process';

import { registerUser, loginUser } from '../src/modules/auth/auth.service';
import { hashPassword } from '../src/modules/auth/auth.utils';

type MockedPrismaUser = {
  findUnique: jest.Mock;
  create: jest.Mock;
  delete: jest.Mock;
};

jest.mock('@prisma/client', () => {
  const mPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mPrisma) };
});

const prisma = new PrismaClient() as unknown as { user: MockedPrismaUser };

describe('Auth Service Unit Tests (Mocked)', () => {
  const testUser = {
    id: 'mock-id-123',
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedpassword123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers a new user when email is not taken', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(testUser);

    const result = await registerUser(testUser.name, testUser.email, 'plainpassword');

    expect(prisma.user.findUnique).toHaveBeenCalled();
    expect(prisma.user.create).toHaveBeenCalled();
    expect(result.email).toBe(testUser.email);
  });

  it('throws if user already exists during registration', async () => {
    prisma.user.findUnique.mockResolvedValue(testUser);

    await expect(registerUser(testUser.name, testUser.email, 'pass')).rejects.toThrow('User already exists');
  });

  it('logs in a user with correct password', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...testUser, password: await hashPassword('correct') });

    const result = await loginUser(testUser.email, 'correct');

    expect(result.email).toBe(testUser.email);
  });

  it('throws if user not found during login', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(loginUser('ghost@example.com', 'irrelevant')).rejects.toThrow('User not found');
  });

  it('throws if password is invalid during login', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...testUser, password: await hashPassword('rightpass') });
    await expect(loginUser(testUser.email, 'wrongpass')).rejects.toThrow('Invalid credentials');
  });
});