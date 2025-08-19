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

describe('Outfit Service Unit Tests (Mocked)', () => {

  // ------------- Service -----------------
  it('creates an outfit with valid closet items', async () => {
    prisma.closetItem.findMany.mockResolvedValue([
      { id: mockClosetItemId, ownerId: mockUserId }
    ]);
    prisma.outfit.create.mockResolvedValue({
      id: mockOutfitId,
      outfitItems: [{ closetItemId: mockClosetItemId }]
    });

    const result = await service.createOutfit({
      userId: mockUserId,
      outfitItems: [
        { closetItemId: mockClosetItemId, layerCategory: "base_top", sortOrder: 0 }
      ],
      warmthRating: 5,
      waterproof: false,
      overallStyle: "Casual" as any,
      weatherSummary: "{\"temperature\":18,\"condition\":\"Cloudy\"}",
      userRating: 5
    });

    expect(result.id).toBe(mockOutfitId);
    expect(result.outfitItems[0].closetItemId).toBe(mockClosetItemId);
    expect(prisma.closetItem.findMany).toHaveBeenCalled();
    expect(prisma.outfit.create).toHaveBeenCalled();
  });

  it('throws if closet items do not belong to user', async () => {
    prisma.closetItem.findMany.mockResolvedValue([]);

    await expect(service.createOutfit({
      userId: mockUserId,
      outfitItems: [
        { closetItemId: mockClosetItemId, layerCategory: "base_top", sortOrder: 0 }
      ],
      warmthRating: 5,
      waterproof: false,
      overallStyle: "Casual" as any,
      weatherSummary: "{\"temperature\":18,\"condition\":\"Cloudy\"}",
      userRating: 5
    })).rejects.toThrow('One or more closet items do not belong to user');
  });

  it('gets all outfits for user', async () => {
    const mockOutfits = [{ id: mockOutfitId, userId: mockUserId, outfitItems: [] }];
    prisma.outfit.findMany.mockResolvedValue(mockOutfits);

    const result = await service.getAllOutfitsForUser(mockUserId);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual(mockOutfits);
    expect(prisma.outfit.findMany).toHaveBeenCalledWith({
      where: { userId: mockUserId },
      include: {
        outfitItems: {
          include: {
            closetItem: {
              select: {
                filename: true,
                category: true,
                layerCategory: true,
              },
            },
          },
        },
      },
    });
  });

  it('gets single outfit by id if owned by user', async () => {
    prisma.outfit.findUnique.mockResolvedValue({
      id: mockOutfitId,
      userId: mockUserId,
      outfitItems: [],
    });

    const result = await service.getOutfitById(mockOutfitId, mockUserId);

    expect(result.id).toBe(mockOutfitId);
    expect(prisma.outfit.findUnique).toHaveBeenCalledWith({
      where: { id: mockOutfitId },
      include: {
        outfitItems: {
          include: {
            closetItem: {
              select: {
                filename: true,
                category: true,
                layerCategory: true,
              },
            },
          },
        },
      },
    });
  });

  it('throws when getting outfit not owned by user', async () => {
    prisma.outfit.findUnique.mockResolvedValue({ id: mockOutfitId, userId: 'different-user', outfitItems: [] });
    await expect(service.getOutfitById(mockOutfitId, mockUserId)).rejects.toThrow('Outfit not found or forbidden');
  });

  it('updates an outfit and replaces items', async () => {
    prisma.outfit.findUnique.mockResolvedValue({
      id: mockOutfitId, userId: mockUserId, outfitItems: [],
    });
    prisma.outfitItem.deleteMany.mockResolvedValue({});
    prisma.outfit.update.mockResolvedValue({
      id: mockOutfitId,
      userId: mockUserId,
      outfitItems: [{ closetItemId: mockClosetItemId }]
    });

    const result = await service.updateOutfit({
      userId: mockUserId,
      outfitId: mockOutfitId,
      userRating: 4,
      outfitItems: [
        { closetItemId: mockClosetItemId, layerCategory: "base_top", sortOrder: 0 }
      ],
      overallStyle: "Casual" as any
    });

    expect(result.id).toBe(mockOutfitId);
    expect(prisma.outfit.update).toHaveBeenCalled();
  });

  it('deletes an outfit and related items', async () => {
    prisma.outfit.findUnique.mockResolvedValue({
      id: mockOutfitId,
      userId: mockUserId,
      outfitItems: [],
    });
    prisma.outfitItem.deleteMany.mockResolvedValue({});
    prisma.outfit.delete.mockResolvedValue({});

    const result = await service.deleteOutfit(mockUserId, mockOutfitId);

    expect(result).toEqual({ success: true });
    expect(prisma.outfitItem.deleteMany).toHaveBeenCalledWith({ where: { outfitId: mockOutfitId } });
    expect(prisma.outfit.delete).toHaveBeenCalledWith({ where: { id: mockOutfitId } });
  });

  // Forbidden
  it('throws when getting an outfit not owned by the user (forbidden)', async () => {
    prisma.outfit.findUnique.mockResolvedValue({
      id: mockOutfitId,
      userId: 'someone-else',
      outfitItems: [],
    });
    await expect(service.getOutfitById(mockOutfitId, mockUserId))
      .rejects
      .toThrow('Outfit not found or forbidden');
  });

  it('throws when updating outfit not owned by user (forbidden)', async () => {
    prisma.outfit.findUnique.mockResolvedValue({
      id: mockOutfitId, userId: 'other-user', outfitItems: [],
    });
    await expect(
      service.updateOutfit({
        userId: mockUserId,
        outfitId: mockOutfitId,
        userRating: 3
      })
    ).rejects.toThrow('Outfit not found or forbidden');
  });

  // Not owned by user
  it('throws when getting items for an outfit not owned by user', async () => {
    prisma.outfit.findUnique.mockResolvedValue({ id: mockOutfitId, userId: 'other-user' });
    await expect(service.getItemsForOutfit(mockOutfitId, mockUserId))
      .rejects.toThrow('Outfit not found or forbidden');
  });

  it('throws when adding item to an outfit not owned by user', async () => {
    prisma.outfit.findUnique.mockResolvedValue({ id: mockOutfitId, userId: 'other-user' });
    await expect(service.addItemToOutfit(
      mockOutfitId,
      mockUserId,
      { closetItemId: mockClosetItemId, layerCategory: "base_top", sortOrder: 1 }
    )).rejects.toThrow('Outfit not found or forbidden');
  });

  // not found
  it('throws when adding item but closet item not found', async () => {
    prisma.outfit.findUnique.mockResolvedValue({ id: mockOutfitId, userId: mockUserId });
    prisma.closetItem.findUnique.mockResolvedValue(null);
    await expect(service.addItemToOutfit(
      mockOutfitId,
      mockUserId,
      { closetItemId: mockClosetItemId, layerCategory: "base_top", sortOrder: 1 }
    )).rejects.toThrow('Closet item not found or forbidden');
  });

  // NOT YOURS!
  it('throws when adding item but closet item is owned by someone else', async () => {
    prisma.outfit.findUnique.mockResolvedValue({ id: mockOutfitId, userId: mockUserId });
    prisma.closetItem.findUnique.mockResolvedValue({ id: mockClosetItemId, ownerId: 'other-user' });
    await expect(service.addItemToOutfit(
      mockOutfitId,
      mockUserId,
      { closetItemId: mockClosetItemId, layerCategory: "base_top", sortOrder: 1 }
    )).rejects.toThrow('Closet item not found or forbidden');
  });

  it('throws when removing item from an outfit not owned by user', async () => {
    prisma.outfit.findUnique.mockResolvedValue({ id: mockOutfitId, userId: 'other-user' });
    await expect(service.removeItemFromOutfit(mockOutfitId, 'item-1', mockUserId))
      .rejects.toThrow('Outfit not found or forbidden');
  });

  // item don't exist
  it('throws when removing item that does not exist', async () => {
    prisma.outfit.findUnique.mockResolvedValue({ id: mockOutfitId, userId: mockUserId });
    prisma.outfitItem.findUnique.mockResolvedValue(null);
    await expect(service.removeItemFromOutfit(mockOutfitId, 'item-1', mockUserId))
      .rejects.toThrow('OutfitItem not found or forbidden');
  });

  // event 
  it('throws when removing item not belonging to the specified outfit', async () => {
    prisma.outfit.findUnique.mockResolvedValue({ id: mockOutfitId, userId: mockUserId });
    prisma.outfitItem.findUnique.mockResolvedValue({ id: 'item-1', outfitId: 'another-outfit' });
    await expect(service.removeItemFromOutfit(mockOutfitId, 'item-1', mockUserId))
      .rejects.toThrow('OutfitItem not found or forbidden');
  });

  // NOT YOURS
  it('throws when deleting outfit not owned by user (forbidden)', async () => {
    prisma.outfit.findUnique.mockResolvedValue({ id: mockOutfitId, userId: 'other-user' });
    await expect(service.deleteOutfit(mockUserId, mockOutfitId))
      .rejects.toThrow('Outfit not found or forbidden');
  });
});
