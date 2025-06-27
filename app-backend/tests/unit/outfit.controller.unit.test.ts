// Global DB mock
jest.mock('@prisma/client', () => {
  const mPrisma = {
    outfit: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    outfitItem: {
      deleteMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    closetItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mPrisma),
    LayerCategory: { base_top: 'base_top' },
    OverallStyle: { Casual: 'Casual' },
    // other enums here if more to be tested
  };
});

// Service
import * as service from '../../src/modules/outfit/outfit.service';
import { PrismaClient } from '@prisma/client';

// Controller 
import OutfitController from '../../src/modules/outfit/outfit.controller';
import { Request, Response, NextFunction } from 'express';
import { OverallStyle, LayerCategory } from '@prisma/client';

// Recommender 
import * as recommender from '../../src/modules/outfit/outfitRecommender.service';
jest.mock('../../src/modules/outfit/outfitRecommender.service');


const prisma = new PrismaClient() as any;

const mockUserId = 'user-123';
const mockOutfitId = 'outfit-456';
const mockClosetItemId = 'closet-789';

const mockUser = { id: 'user-1' };
const mockRes = (): Response => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn(),
  };
  return res as Response;
};
const next = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});


// ---------- Controller ------------
jest.mock('../../src/modules/outfit/outfit.service');

describe('Outfit Controller Edge/Branch Tests', () => {
  //       ----   Create   ----
  // Unauthorized
  it('returns 401 if no user on create', async () => {
    const req = { body: {} } as Request;
    const res = mockRes();
    await OutfitController.create(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  // invalid enums 
  it('returns 400 if overallStyle is invalid', async () => {
    const req = {
      user: mockUser,
      body: {
        outfitItems: [{ layerCategory: LayerCategory.base_top }],
        overallStyle: 'INVALID'
      }
    } as any;
    const res = mockRes();
    await OutfitController.create(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid enum values in request' });
  });

  it('returns 400 if any outfitItems.layerCategory is invalid', async () => {
    const req = {
      user: mockUser,
      body: {
        outfitItems: [{ layerCategory: 'not_a_layer' }],
        overallStyle: OverallStyle.Casual
      }
    } as any;
    const res = mockRes();
    await OutfitController.create(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid enum values in request' });
  });

  // service error
  it('calls next on service error during create', async () => {
    (service.createOutfit as jest.Mock).mockRejectedValueOnce(new Error('forbidden'));
    const req = {
      user: mockUser,
      body: {
        outfitItems: [{ layerCategory: LayerCategory.base_top }],
        overallStyle: OverallStyle.Casual
      }
    } as any;
    const res = mockRes();
    await OutfitController.create(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  //  ---- getAll ----
  // unauthorized
  it('returns 401 if no user on getAll', async () => {
    const req = {} as Request;
    const res = mockRes();
    await OutfitController.getAll(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  // service error 
  it('calls next on service error during getAll', async () => {
    (service.getAllOutfitsForUser as jest.Mock).mockRejectedValueOnce(new Error('forbidden'));
    const req = { user: mockUser } as any;
    const res = mockRes();
    await OutfitController.getAll(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ---- getById ----
  // unauthorized 
  it('returns 401 if no user on getById', async () => {
    const req = { params: { id: 'outfit-1' } } as any;
    const res = mockRes();
    await OutfitController.getById(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  // service error/not found 
  it('returns 404 if service throws in getById', async () => {
    (service.getOutfitById as jest.Mock).mockRejectedValueOnce(new Error('not found'));
    const req = { user: mockUser, params: { id: 'outfit-1' } } as any;
    const res = mockRes();
    await OutfitController.getById(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'not found' });
  });

  // ---- update ----
  // unauthorized
  it('returns 401 if no user on update', async () => {
    const req = { params: { id: 'outfit-1' }, body: {} } as any;
    const res = mockRes();
    await OutfitController.update(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  // service error/not found 
  it('returns 404 if service throws in update', async () => {
    (service.updateOutfit as jest.Mock).mockRejectedValueOnce(new Error('forbidden'));
    const req = { user: mockUser, params: { id: 'outfit-1' }, body: {} } as any;
    const res = mockRes();
    await OutfitController.update(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'forbidden' });
  });

  // ---- delete ----
  // unauthorized
  it('returns 401 if no user on delete', async () => {
    const req = { params: { id: 'outfit-1' } } as any;
    const res = mockRes();
    await OutfitController.delete(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  //service error/not found
  it('returns 404 if service throws in delete', async () => {
    (service.deleteOutfit as jest.Mock).mockRejectedValueOnce(new Error('forbidden'));
    const req = { user: mockUser, params: { id: 'outfit-1' } } as any;
    const res = mockRes();
    await OutfitController.delete(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'forbidden' });
  });

  // ---- addItem ----
  // unauthorized
  it('returns 401 if no user on addItem', async () => {
    const req = { params: { id: 'outfit-1' }, body: {} } as any;
    const res = mockRes();
    await OutfitController.addItem(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  // invalid enum
  it('returns 400 if layerCategory is invalid on addItem', async () => {
    const req = {
      user: mockUser,
      params: { id: 'outfit-1' },
      body: { closetItemId: 'closet-123', layerCategory: 'not_a_layer', sortOrder: 1 }
    } as any;
    const res = mockRes();
    await OutfitController.addItem(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid layerCategory' });
  });

  //service error
  it('returns 400 if service throws in addItem', async () => {
    (service.addItemToOutfit as jest.Mock).mockRejectedValueOnce(new Error('forbidden'));
    const req = {
      user: mockUser,
      params: { id: 'outfit-1' },
      body: { closetItemId: 'closet-123', layerCategory: LayerCategory.base_top, sortOrder: 1 }
    } as any;
    const res = mockRes();
    await OutfitController.addItem(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'forbidden' });
  });

  // ---- removeItem ----
  // authorized
  it('returns 401 if no user on removeItem', async () => {
    const req = { params: { id: 'outfit-1', itemId: 'item-1' } } as any;
    const res = mockRes();
    await OutfitController.removeItem(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  // service error
  it('returns 400 if service throws in removeItem', async () => {
    (service.removeItemFromOutfit as jest.Mock).mockRejectedValueOnce(new Error('forbidden'));
    const req = {
      user: mockUser,
      params: { id: 'outfit-1', itemId: 'item-1' }
    } as any;
    const res = mockRes();
    await OutfitController.removeItem(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'forbidden' });
  });

  // ---- recommend ----
  // unauthorized
  it('returns 401 if no user on recommend', async () => {
    const req = { body: {} } as any;
    const res = mockRes();
    await OutfitController.recommend(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  // service error 
  it('calls next if recommender throws', async () => {
    (recommender.recommendOutfits as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    const req = { user: mockUser, body: {} } as any;
    const res = mockRes();
    await OutfitController.recommend(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });


});
