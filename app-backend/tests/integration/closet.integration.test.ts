// tests/integration/closet.integration.test.ts

import request from 'supertest';
import app from '../../src/app';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'defaultsecret';

describe('Integration: Closet', () => {
  let token: string;
  let userId: string;

  beforeEach(async () => {
    await prisma.closetItem.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: {
        name: 'Closet User',
        email: 'closetuser@example.com',
        password: 'hashedpass'
      }
    });
    userId = user.id;
    token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
  });

  afterAll(async () => {
    await prisma.closetItem.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it('POST /api/closet/upload should add a closet item', async () => {
    // Create a dummy image
    const imgPath = path.join(__dirname, 'dummy.jpg');
    fs.writeFileSync(imgPath, 'dummy image data');

    const res = await request(app)
      .post('/api/closet/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('category', 'TSHIRT')
      .field('layerCategory', 'base_top')
      .attach('image', imgPath);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.category).toBe('TSHIRT');

    // Clean up dummy image
    fs.unlinkSync(imgPath);
  });

  it('GET /api/closet/all returns all items for the user', async () => {
    // Insert an item directly for this user
    await prisma.closetItem.create({
      data: {
        filename: 'test.jpg',
        category: 'TSHIRT',
        layerCategory: 'base_top',
        ownerId: userId,
      }
    });
    const res = await request(app)
      .get('/api/closet/all')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  // Add more: GET by category, DELETE item, PATCH item, etc.

});
