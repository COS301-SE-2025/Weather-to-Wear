// 1. Mock PrismaClient and all used models/methods BEFORE importing the service.
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
  return { PrismaClient: jest.fn(() => mPrisma) };
});

// 2. Import service and PrismaClient AFTER the mock.
import * as service from '../src/modules/outfit/outfit.service';
import { PrismaClient } from '@prisma/client';

// 3. Cast the PrismaClient so you can easily use mocks in the tests.
const prisma = new PrismaClient() as any;

const mockUserId = 'user-123';
const mockOutfitId = 'outfit-456';
const mockClosetItemId = 'closet-789';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Outfit Service Unit Tests (Mocked)', () => {
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
            closetItem: true
          }
        }
      }
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
      include: { outfitItems: { include: { closetItem: true } } }
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
});
