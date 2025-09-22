import request from 'supertest';
import app from '../../src/app';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

import ClosetService from '../../src/modules/closet/closet.service';
import axios from 'axios';
import { putBufferSmart } from '../../src/utils/s3';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'defaultsecret';
jest.mock('axios');
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

// ------------------ INTEGRATION TESTS ------------------
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
    const res = await request(app).get('/api/closet/all');
    expect(res.status).toBe(401);
  });

  it('POST /api/closet/upload returns 400 if no file is provided', async () => {
    const res = await request(app)
      .post('/api/closet/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('category', 'TSHIRT')
      .field('layerCategory', 'base_top');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'No file provided');
  });

  it('POST /api/closet/upload requires auth', async () => {
    const res = await request(app)
      .post('/api/closet/upload')
      .field('category', 'TSHIRT')
      .field('layerCategory', 'base_top');
    expect(res.status).toBe(401);
  });

  it('POST /api/closet/upload/batch returns 400 if items is not an array', async () => {
    const res = await request(app)
      .post('/api/closet/upload/batch')
      .set('Authorization', `Bearer ${token}`)
      .field('items', JSON.stringify({ not: 'an array' }));
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', '"items" must be a JSON array');
  });

  it('POST /api/closet/upload/batch returns 400 if a file is missing for item', async () => {
    const res = await request(app)
      .post('/api/closet/upload/batch')
      .set('Authorization', `Bearer ${token}`)
      .field('items', JSON.stringify([
        {
          category: 'TSHIRT',
          layerCategory: 'base_top',
          filename: 'image1'
        }
      ]));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Missing file for image1/);
  });

  it('GET /api/closet/category/:category returns 401 without auth', async () => {
    const res = await request(app).get('/api/closet/category/TSHIRT');
    expect(res.status).toBe(401);
  });

  it('PATCH /api/closet/:id requires auth', async () => {
    const res = await request(app)
      .patch(`/api/closet/${closetItemId}`)
      .send({ colorHex: '#FFFFFF' });
    expect(res.status).toBe(401);
  });

  it('PATCH /api/closet/:id/favourite requires auth', async () => {
    const res = await request(app).patch(`/api/closet/${closetItemId}/favourite`);
    expect(res.status).toBe(401);
  });

  it('DELETE /api/closet/:id requires auth', async () => {
    const res = await request(app).delete(`/api/closet/${closetItemId}`);
    expect(res.status).toBe(401);
  });

  // repeat GET test for coverage
  it('GET /api/closet/all returns all items for the user (again)', async () => {
    const res = await request(app)
      .get('/api/closet/all')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('category', 'TSHIRT');
    expect(res.body[0]).toHaveProperty('favourite', false);
  });
});

// ------------------ UNIT TESTS ------------------
describe('Unit: ClosetService', () => {
  let prismaMock: any;
  const axiosMock = axios as jest.Mocked<typeof axios>;
  const s3Mock = putBufferSmart as jest.Mock;

  const fakeFile: Express.Multer.File = {
    buffer: Buffer.from('fake'),
    originalname: 'test.png',
    mimetype: 'image/png',
    fieldname: 'image',
    size: 123,
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
    encoding: '7bit',
  };

  beforeEach(() => {
    jest.resetAllMocks();
    prismaMock = {
      closetItem: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    (ClosetService as any).prisma = prismaMock;

    process.env.BG_REMOVAL_URL = 'http://bg';
    process.env.COLOR_EXTRACT_URL = 'http://color';
    process.env.S3_BUCKET_NAME = 'bucket';
    process.env.S3_REGION = 'region';
  });

  afterEach(() => {
    // restore the real prisma after unit tests
    (ClosetService as any).prisma = prisma;
  });

  it('saveImage runs full pipeline', async () => {
    axiosMock.post
      .mockResolvedValueOnce({ data: Buffer.from('nobg') }) // bg removal
      .mockResolvedValueOnce({ data: { colors: ['#111', '#222'] } }); // color extraction
    s3Mock.mockResolvedValueOnce({ key: 'mock-key', publicUrl: 'https://cdn.test/mock-key' });
    prismaMock.closetItem.create.mockResolvedValueOnce({
      id: '1',
      filename: 'key.png',
      category: 'TSHIRT',
      layerCategory: 'base_top',
      ownerId: 'u1',
      colorHex: '#111',
      dominantColors: ['#111', '#222'],
      favourite: false,
      warmthFactor: null,
      waterproof: null,
      style: null,
      material: null,
      createdAt: new Date(),
    });

    const result = await ClosetService.saveImage(fakeFile, 'TSHIRT', 'base_top', 'u1');
    expect(result.id).toBe('1');
    expect(axiosMock.post).toHaveBeenCalledTimes(2);
    expect(s3Mock).toHaveBeenCalled();
    expect(prismaMock.closetItem.create).toHaveBeenCalled();
  });

  it('saveImagesBatch calls saveImage for each file', async () => {
    const spy = jest.spyOn(ClosetService, 'saveImage').mockResolvedValueOnce({} as any);
    await ClosetService.saveImagesBatch([fakeFile], 'TSHIRT', 'base_top', 'u1');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('getImagesByCategory delegates to prisma', async () => {
    prismaMock.closetItem.findMany.mockResolvedValueOnce([{ id: 'x' }]);
    const res = await ClosetService.getImagesByCategory('TSHIRT', 'u1');
    expect(res[0].id).toBe('x');
  });

  it('getAllImages delegates to prisma', async () => {
    prismaMock.closetItem.findMany.mockResolvedValueOnce([{ id: 'a' }]);
    const res = await ClosetService.getAllImages('u1');
    expect(res[0].id).toBe('a');
  });

  it('deleteImage deletes existing', async () => {
    prismaMock.closetItem.findFirst.mockResolvedValueOnce({ id: 'd1', filename: 'f.png' });
    prismaMock.closetItem.delete.mockResolvedValueOnce(undefined);
    await ClosetService.deleteImage('d1', 'u1');
    expect(prismaMock.closetItem.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
  });

  it('updateImage updates if found', async () => {
    prismaMock.closetItem.findFirst.mockResolvedValueOnce({ id: 'u1' });
    prismaMock.closetItem.update.mockResolvedValueOnce({ id: 'u1', colorHex: '#123' });
    const res = await ClosetService.updateImage('u1', 'u1', { colorHex: '#123' });
    expect(res.colorHex).toBe('#123');
  });

  it('toggleFavourite flips value', async () => {
    prismaMock.closetItem.findFirst.mockResolvedValueOnce({ id: 'f1', favourite: false });
    prismaMock.closetItem.update.mockResolvedValueOnce({ id: 'f1', favourite: true });
    const res = await ClosetService.toggleFavourite('f1', 'u1');
    expect(res.favourite).toBe(true);
  });
});
