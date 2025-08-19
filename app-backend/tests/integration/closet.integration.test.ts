import request from 'supertest';
import app from '../../src/app';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'defaultsecret';

describe('Integration: Closet', () => {
  let token: string;
  let userId: string;
  let closetItemId: string;

  beforeEach(async () => {
    await prisma.closetItem.deleteMany();
    await prisma.like.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.post.deleteMany();
    await prisma.follow.deleteMany();
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

    const item = await prisma.closetItem.create({
      data: {
        filename: 'test.jpg',
        category: 'TSHIRT',
        layerCategory: 'base_top',
        ownerId: userId,
        colorHex: '#ABCDEF',
        warmthFactor: 5,
        waterproof: false,
        style: 'Casual',
        material: 'Cotton',
        favourite: false,
      }
    });
    closetItemId = item.id;
  });

  afterAll(async () => {
    await prisma.closetItem.deleteMany();
    await prisma.like.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.post.deleteMany();
    await prisma.follow.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it('GET /api/closet/all returns all items for the user', async () => {
    const res = await request(app)
      .get('/api/closet/all')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('category', 'TSHIRT');
    expect(res.body[0]).toHaveProperty('favourite', false);
  });

  it('GET /api/closet/category/:category returns items by category', async () => {
    const res = await request(app)
      .get('/api/closet/category/TSHIRT')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].category).toBe('TSHIRT');
  });

  it('PATCH /api/closet/:id updates a closet item', async () => {
    const res = await request(app)
      .patch(`/api/closet/${closetItemId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        colorHex: '#123456',
        warmthFactor: 7,
        style: 'Business'
      });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(closetItemId);
    expect(res.body.colorHex).toBe('#123456');
    expect(res.body.warmthFactor).toBe(7);
    expect(res.body.style).toBe('Business');
  });

  it('PATCH /api/closet/:id/favourite toggles favourite', async () => {
    const res1 = await request(app)
      .patch(`/api/closet/${closetItemId}/favourite`)
      .set('Authorization', `Bearer ${token}`);

    expect(res1.status).toBe(200);
    expect(res1.body).toHaveProperty('id', closetItemId);
    expect(res1.body.favourite).toBe(true);

    const res2 = await request(app)
      .patch(`/api/closet/${closetItemId}/favourite`)
      .set('Authorization', `Bearer ${token}`);
    expect(res2.body.favourite).toBe(false);
  });

  it('DELETE /api/closet/:id deletes a closet item', async () => {
    const res = await request(app)
      .delete(`/api/closet/${closetItemId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);

    const item = await prisma.closetItem.findUnique({ where: { id: closetItemId } });
    expect(item).toBeNull();
  });

  it('should require auth for all closet routes', async () => {
    const res = await request(app)
      .get('/api/closet/all');
    expect(res.status).toBe(401);
  });
});
