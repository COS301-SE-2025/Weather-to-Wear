import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import path from 'path';
import jwt from 'jsonwebtoken';

import { upload } from '../../src/middleware/upload.middleware';
import service from '../../src/modules/closet/closet.service';
import controller from '../../src/modules/closet/closet.controller';
import closetRoutes from '../../src/modules/closet/closet.route';

import type { AuthenticatedRequest } from '../../src/modules/auth/auth.middleware';

const TEST_USER = { id: 'test-user-id', email: 'test@test.com' };
const TEST_TOKEN = jwt.sign(TEST_USER, process.env.JWT_SECRET || 'defaultsecret');

describe('Upload Middleware', () => {
  it('has a `.single("image")` method', () => {
    expect(upload).toHaveProperty('single');
    expect(typeof upload.single).toBe('function');
  });

  it('`single("image")` is a 3-arg Express middleware', () => {
    const mw = upload.single('image');
    expect(typeof mw).toBe('function');
    expect(mw.length).toBe(3);
  });
});

describe('ClosetService', () => {
  beforeEach(() => {
    (service as any).prisma = {
      closetItem: {
        create: jest.fn().mockResolvedValue({ id: '123', filename: 'foo.png', category: 'SHOES', ownerId: 'test-user-id' }),
        findMany: jest.fn().mockResolvedValue([]),
      }
    };
  });

  it('getAllImages calls prisma.closetItem.findMany and returns array', async () => {
    const items = await service.getAllImages('test-user-id');
    expect((service as any).prisma.closetItem.findMany).toHaveBeenCalled();
    expect(items).toEqual([]);
  });
});

describe('ClosetController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('uploadImage', () => {
    it('returns 400 if no file', async () => {
      let req: Partial<AuthenticatedRequest> = {};
      req.file = undefined;
      req.body = { category: 'SHOES', layerCategory: 'footwear' };
      req.user = { ...TEST_USER };
      await controller.uploadImage(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'No file provided' });
    });

    it('calls service.saveImage and returns 201 + payload', async () => {
      const fakeFile = { buffer: Buffer.from(''), filename: 'img.png' } as any;

      jest.spyOn(service, 'saveImage').mockResolvedValue({
        id: "1",
        filename: 'img.png',
        category: 'SHOES',
        layerCategory: 'footwear',
        createdAt: new Date('2025-05-27T00:00:00.000Z'),
        ownerId: 'test-user-id',
        colorHex: null,
        dominantColors: null,
        warmthFactor: null,
        waterproof: null,
        style: null,
        material: null,
        favourite: false,
      });

      let req: Partial<AuthenticatedRequest> = {};
      req.file = fakeFile;
      req.body = { category: 'SHOES', layerCategory: 'footwear' };
      req.user = { ...TEST_USER };

      await controller.uploadImage(req as Request, res as Response, next);

      expect(service.saveImage).toHaveBeenCalledWith(
        fakeFile,
        'SHOES',
        'footwear',
        'test-user-id',
        {
          colorHex: undefined,
          warmthFactor: undefined,
          waterproof: undefined,
          style: undefined,
          material: undefined,
        },
        undefined
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        id: '1',
        category: 'SHOES',
        imageUrl: '/uploads/img.png',
        createdAt: new Date('2025-05-27T00:00:00.000Z'),
        colorHex: null,
        warmthFactor: null,
        waterproof: null,
        style: null,
        material: null,
      });
    });

    it('forwards errors to next()', async () => {
      let req: Partial<AuthenticatedRequest> = {};
      const err = new Error('oops');
      (service.saveImage as jest.Mock) = jest.fn().mockRejectedValue(err);
      req.file = { buffer: Buffer.from('') } as any;
      req.body = { category: 'SHOES' };
      req.user = { ...TEST_USER };
      await controller.uploadImage(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('getAll', () => {
    it('returns 200 + formatted URLs', async () => {
      (service.getAllImages as jest.Mock) = jest.fn().mockResolvedValue([
        {
          id: 1,
          filename: 'a.png',
          category: 'SHOES',
          createdAt: new Date(),
          ownerId: 'test-user-id',
          dominantColors: null,
        }
      ]);

      let req: Partial<AuthenticatedRequest> = {};
      (req as any).protocol = 'http';
      (req as any).get = () => 'localhost:5001';
      req.user = { ...TEST_USER };

      await controller.getAll(req as Request, res as Response, next);

      expect(service.getAllImages).toHaveBeenCalledWith('test-user-id');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 1,
          category: 'SHOES',
          imageUrl: '/uploads/a.png',
          createdAt: expect.any(Date),
        })
      ]);
    });

    it('forwards errors to next()', async () => {
      let req: Partial<AuthenticatedRequest> = {};
      const err = new Error('fail');
      (service.getAllImages as jest.Mock) = jest.fn().mockRejectedValue(err);
      req.user = { ...TEST_USER };
      await controller.getAll(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('getByCategory', () => {
    it('filters and returns 200', async () => {
      const items = [
        { id: 1, filename: 'a.png', category: 'SHOES', createdAt: new Date(), ownerId: 'test-user-id' }
      ];
      jest.spyOn(service, 'getImagesByCategory').mockResolvedValue(items as any);

      let req: Partial<AuthenticatedRequest> = {};
      (req as any).params = { category: 'SHOES' };
      (req as any).protocol = 'http';
      (req as any).get = () => 'localhost:5001';
      req.user = { ...TEST_USER };

      await controller.getByCategory(req as Request, res as Response, next);

      expect(service.getImagesByCategory).toHaveBeenCalledWith('SHOES', 'test-user-id');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 1,
          category: 'SHOES',
          imageUrl: '/uploads/a.png',
          createdAt: expect.any(Date),
        })
      ]);
    });
  });

  describe('updateItem', () => {
    it('updates item successfully', async () => {
      jest.spyOn(service, 'updateImage').mockResolvedValue({
        id: '1',
        filename: 'shirt.png',
        category: 'SHIRT',
        layerCategory: 'base_top',
        createdAt: new Date(),
        colorHex: null,
        dominantColors: null,
        warmthFactor: null,
        waterproof: null,
        style: 'Casual',
        material: null,
        ownerId: 'test-user-id',
        favourite: false
      });

      let req: Partial<AuthenticatedRequest> = {
        params: { id: '1' },
        body: { category: 'SHIRT', favorite: true },
        user: { ...TEST_USER }
      };

      await controller.updateItem(req as Request, res as Response, next);

      expect(service.updateImage).toHaveBeenCalledWith('1', 'test-user-id', { category: 'SHIRT' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: '1',
        category: 'SHIRT',
        imageUrl: '/uploads/shirt.png',
        createdAt: expect.any(Date),
        colorHex: null,
        warmthFactor: null,
        waterproof: null,
        style: 'Casual',
        material: null
      });
    });
  });

  describe('deleteItem', () => {
    it('deletes item successfully', async () => {
      jest.spyOn(service, 'deleteImage').mockResolvedValue(undefined);

      let req: Partial<AuthenticatedRequest> = {
        params: { id: '1' },
        user: { ...TEST_USER }
      };

      await controller.deleteItem(req as Request, res as Response, next);

      expect(service.deleteImage).toHaveBeenCalledWith('1', 'test-user-id');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('uploadImagesBatch', () => {
    it('returns 401 if user missing', async () => {
      let req: Partial<AuthenticatedRequest> = {};
      req.files = [{ filename: 'a.png' }] as any;
      req.body = { category: 'SHOES', layerCategory: 'footwear' };
      req.user = undefined;
      await controller.uploadImagesBatch(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 400 if no files', async () => {
      let req: Partial<AuthenticatedRequest> = { user: { ...TEST_USER }, files: undefined, body: { category: 'SHOES' } };
      await controller.uploadImagesBatch(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing "items" field in body' });
    });

    it('returns 400 if category is invalid', async () => {
      let req: Partial<AuthenticatedRequest> = {
        user: { ...TEST_USER },
        files: [{ filename: 'a.png' }] as any,
        body: { category: 'INVALID' }
      };
      await controller.uploadImagesBatch(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing "items" field in body' });
    });

    it('calls service.saveImage and returns 201 + payload', async () => {
      jest.spyOn(service, 'saveImage').mockResolvedValue({
        id: '1',
        filename: 'a.png',
        category: 'SHOES',
        layerCategory: 'footwear',
        createdAt: new Date(),
        ownerId: 'test-user-id',
        colorHex: '#ffffff',
        dominantColors: ["#fdfdfd", "#1a253c", "#334363"],
        warmthFactor: 5,
        waterproof: false,
        style: 'Casual',
        material: 'Cotton',
        favourite: false
      });

      let req: Partial<AuthenticatedRequest> = {
        user: { ...TEST_USER },
        files: [{ fieldname: 'a.png', path: 'mock/path/a.png' }] as any,
        body: {
          items: JSON.stringify([
            {
              filename: 'a.png',
              category: 'SHOES',
              layerCategory: 'footwear',
              colorHex: '#ffffff',
              warmthFactor: 5,
              waterproof: false,
              style: 'Casual',
              material: 'Cotton'
            }
          ])
        }
      };

      await controller.uploadImagesBatch(req as Request, res as Response, next);

      expect(service.saveImage).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({
          id: '1',
          category: 'SHOES',
          imageUrl: '/uploads/a.png'
        })
      ]);
    });
  });
});

describe('Closet Routes Extended', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.spyOn(service, 'getAllImages').mockResolvedValue([
      { id: 1, filename: 'a.png', category: 'SHOES', createdAt: new Date(), ownerId: 'test-user-id' }
    ] as any);

    jest.spyOn(service, 'getImagesByCategory').mockResolvedValue([
      { id: 1, filename: 'a.png', category: 'SHOES', createdAt: new Date(), ownerId: 'test-user-id' }
    ] as any);

    jest.spyOn(service, 'updateImage').mockResolvedValue({
      id: '1',
      filename: 'shirt.png',
      category: 'SHIRT',
      layerCategory: 'base_top',
      createdAt: new Date(),
      colorHex: null,
      dominantColors: null,
      warmthFactor: null,
      waterproof: null,
      style: 'Casual',
      material: null,
      ownerId: 'test-user-id',
      favourite: false
    });

  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/uploads', express.static(path.join(__dirname, '../src/uploads')));
    app.use('/api/closet', closetRoutes);
  });

  it('GET /api/closet/all → 200 and returns stubbed items', async () => {
    const res = await request(app)
      .get('/api/closet/all')
      .set('Authorization', `Bearer ${TEST_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({
        id: 1,
        category: 'SHOES',
        imageUrl: '/uploads/a.png',
        createdAt: expect.any(String),
      })
    ]);
  });

  it('GET /api/closet/category/:category → 200 and filters correctly', async () => {
    const res = await request(app)
      .get('/api/closet/category/SHOES')
      .set('Authorization', `Bearer ${TEST_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({
        id: 1,
        category: 'SHOES',
        imageUrl: '/uploads/a.png',
        createdAt: expect.any(String),
      })
    ]);
  });

  it('PATCH /api/closet/:id → updates item', async () => {
    const res = await request(app)
      .patch('/api/closet/1')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ category: 'SHIRT', favorite: true });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
      id: '1',
      category: 'SHIRT',
      // imageUrl: 'https://d1ij89nbpof6q0.cloudfront.net/shirt.png',
      imageUrl: '/uploads/shirt.png',
      createdAt: expect.any(String),
      colorHex: null,
      warmthFactor: null,
      waterproof: null, 
      style: 'Casual',
      material: null
    }));
  });

  it('DELETE /api/closet/:id → deletes item', async () => {
    const res = await request(app)
      .delete('/api/closet/1')
      .set('Authorization', `Bearer ${TEST_TOKEN}`);

    expect(res.status).toBe(204);
  });
});
