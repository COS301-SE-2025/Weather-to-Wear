// import request from 'supertest';
// import app from '../src/app';
import { PrismaClient } from '@prisma/client';
// import { execSync } from 'child_process';

import { registerUser, loginUser, removeUser } from '../../src/modules/auth/auth.service';
import { hashPassword } from '../../src/modules/auth/auth.utils';
import * as utils from '../../src/modules/auth/auth.utils';
import { authenticateToken, signupPasswordValidation } from '../../src/modules/auth/auth.middleware';

import jwt from 'jsonwebtoken';
import { Request } from 'express';



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

  it('removes a user that exists', async () => {
    prisma.user.findUnique.mockResolvedValue(testUser);
    prisma.user.delete.mockResolvedValue(testUser);
    const result = await removeUser(testUser.id);
    expect(result.email).toBe(testUser.email);
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: testUser.id } });
  });

  it('throws if user not found during removal', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(removeUser('ghost-id')).rejects.toThrow('User not found');
  });
});

describe('Auth Utils', () => {
  it('hashes password and compares successfully', async () => {
    const pw = 'MyP@ssw0rd!';
    const hash = await utils.hashPassword(pw);
    expect(hash).not.toBe(pw);
    expect(await utils.comparePasswords(pw, hash)).toBe(true);
    expect(await utils.comparePasswords('wrong', hash)).toBe(false);
  });

  it('generates a valid JWT token', () => {
    const payload = { id: 'abc', email: 'x@y.com' };
    const token = utils.generateToken(payload);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret');
    expect(decoded).toMatchObject(payload);
  });

  it('validates password strength', () => {
    expect(utils.validatePassword('Short1!')).toBe(false);
    expect(utils.validatePassword('longbutnoupper1!')).toBe(false);
    expect(utils.validatePassword('NoSpecial1')).toBe(false);
    expect(utils.validatePassword('ValidP@ss1')).toBe(true);
  });
});

describe('Auth Middleware', () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 if token missing', () => {
    const req = { headers: {} } as Partial<Request> as any;
    authenticateToken(req, res as any, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 if token invalid', () => {
    // Mock an invalid token
    // const req = { headers: { authorization: 'Bearer badtoken' } };
    const req = { headers: { authorization: 'Bearer badtoken' } } as Partial<Request> as any;
    // jest.spyOn(jwt, 'verify').mockImplementation((t, s, cb) => cb(new Error('Invalid token'), null));
    jest.spyOn(jwt, 'verify').mockImplementation((token, secret, callback) => {
      // @ts-ignore
      return callback(new Error('Invalid token'), undefined);
    });
    authenticateToken(req, res as any, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
    (jwt.verify as jest.Mock).mockRestore();
  });

  it('sets req.user and calls next for valid token', () => {
    const user = { id: 'id', email: 'email' };
    const req: any = { headers: { authorization: 'Bearer goodtoken' } };
    jest.spyOn(jwt, 'verify').mockImplementation((token, secret, callback) => {
      // @ts-ignore
      return callback(null, user);
    });
    authenticateToken(req, res as any, next);
    expect(req.user).toEqual(user);
    expect(next).toHaveBeenCalled();
    (jwt.verify as jest.Mock).mockRestore();
  });

  it('400 for invalid password in signupPasswordValidation', () => {
    const req: any = { body: { password: 'weak' } };
    signupPasswordValidation(req, res as any, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() for valid password in signupPasswordValidation', () => {
    const req: any = { body: { password: 'ValidP@ssword1' } };
    signupPasswordValidation(req, res as any, next);
    expect(next).toHaveBeenCalled();
  });
});