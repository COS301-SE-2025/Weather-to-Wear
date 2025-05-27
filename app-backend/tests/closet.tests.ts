// tests/closet.tests.ts    
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import path from 'path';

// --- point at your real code under src/ ---
import { upload } from '../src/middleware/upload.middleware';
import service from '../src/modules/closet/closet.service';
import controller from '../src/modules/closet/closet.controller';
import closetRoutes from '../src/modules/closet/closet.route';

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
    // stub out prisma client
    (service as any).prisma = {
      closetItem: {
        create: jest.fn().mockResolvedValue({ id: 123, filename: 'foo.png', category: 'SHOES' }),
        findMany: jest.fn().mockResolvedValue([])
      }
    };
  });

  it('saveImage calls prisma.closetItem.create with buffer & category', async () => {
    const fakeFile = { buffer: Buffer.from('x') } as Express.Multer.File;
    const result = await service.saveImage(fakeFile, 'SHOES' as any);

    expect((service as any).prisma.closetItem.create).toHaveBeenCalledWith({
      data: { filename: fakeFile.filename, category: 'SHOES' }
    });
    expect(result).toEqual({ id: 123, filename: 'foo.png', category: 'SHOES' });
  });

  it('getAllImages calls prisma.closetItem.findMany and returns array', async () => {
    const items = await service.getAllImages();
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
      req.file = undefined;
      req.body = { category: 'SHOES' };
      await controller.uploadImage(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'No file provided' });
    });

    it('calls service.saveImage and returns 201 + payload', async () => {
      const fakeFile = { buffer: Buffer.from(''), originalname: 'img.png' } as any;
      jest.spyOn(service, 'saveImage').mockResolvedValue({
        id: "1",
        filename: 'img.png',
        category: 'SHOES',
        createdAt: new Date('2025-05-27T00:00:00.000Z')
      });
      req.file = fakeFile;
      req.body = { category: 'SHOES' };
      await controller.uploadImage(req as Request, res as Response, next);

      expect(service.saveImage).toHaveBeenCalledWith(fakeFile, 'SHOES');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        id:        '1',
        category:  'SHOES',
        imageUrl:  '/uploads/img.png',
        createdAt: expect.any(Date)
      });
    });

    it('forwards errors to next()', async () => {
      const err = new Error('oops');
      (service.saveImage as jest.Mock) = jest.fn().mockRejectedValue(err);
      req.file = { buffer: Buffer.from('') } as any;
      req.body = { category: 'SHOES' };
      await controller.uploadImage(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('getAll', () => {
    it('returns 200 + formatted URLs', async () => {
      const items = [{ id: 1, filename: 'a.png', category: 'SHOES', createdAt: new Date() }];
      (service.getAllImages as jest.Mock) = jest.fn().mockResolvedValue(items);

      (req as any).protocol = 'http';
      (req as any).get = () => 'localhost:5001';

      await controller.getAll(req as Request, res as Response, next);

      expect(service.getAllImages).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 1,
          category: 'SHOES',
          imageUrl: '/uploads/a.png',
          createdAt: expect.any(Date)
        })
      ]);
    });

    it('forwards errors to next()', async () => {
      const err = new Error('fail');
      (service.getAllImages as jest.Mock) = jest.fn().mockRejectedValue(err);
      await controller.getAll(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('getByCategory', () => {
    it('filters and returns 200', async () => {
      const items = [
        { id: 1, filename: 'a.png', category: 'SHOES', createdAt: new Date() }
      ];
      jest.spyOn(service, 'getImagesByCategory').mockResolvedValue(items as any);
      
      (req as any).params = { category: 'SHOES' };
      (req as any).protocol = 'http';
      (req as any).get = () => 'localhost:5001';

      await controller.getByCategory(req as Request, res as Response, next);

      expect(service.getImagesByCategory).toHaveBeenCalledWith('SHOES');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        {
          id:        1,
          category:  'SHOES',
          imageUrl:  '/uploads/a.png',
          createdAt: expect.any(Date)
        }
      ]);
    });
  });
});

describe('Closet Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    // 1) Stub out the service methods
    jest
      .spyOn(service, 'getAllImages')
      .mockResolvedValue([
        { id: 1, filename: 'a.png', category: 'SHOES', createdAt: new Date() }
      ] as any);

    jest
      .spyOn(service, 'getImagesByCategory')
      .mockResolvedValue([
        { id: 1, filename: 'a.png', category: 'SHOES', createdAt: new Date() }
      ] as any);

    // 2) Spin up an Express app with the static uploads and your router
    app = express();
    app.use(express.json());

    // (optional) If your controller uses express.static to serve /uploads:
    app.use(
      '/uploads',
      express.static(path.join(__dirname, '../src/uploads'))
    );

    app.use('/api/closet', closetRoutes);
  });

  it('GET /api/closet/all → 200 and returns stubbed items', async () => {
    const res = await request(app).get('/api/closet/all');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({
        id:        1,
        category:  'SHOES',
        imageUrl:  '/uploads/a.png',
        createdAt: expect.any(String) // if JSON‐stringified date
      })
    ]);
  });

  it('GET /api/closet/category/:category → 200 and filters correctly', async () => {
    const res = await request(app).get('/api/closet/category/SHOES');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({
        id:        1,
        category:  'SHOES',
        imageUrl:  '/uploads/a.png',
        createdAt: expect.any(String)
      })
    ]);
  });
});
