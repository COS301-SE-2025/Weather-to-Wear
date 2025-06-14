import { PrismaClient, Outfit, OutfitItem, OverallStyle, LayerCategory } from '@prisma/client';

const prisma = new PrismaClient();

export type CreateOutfitItemInput = {
  closetItemId: string;
  layerCategory: LayerCategory; // already enum
  sortOrder: number;
};

export type CreateOutfitInput = {
  userId: string;
  outfitItems: CreateOutfitItemInput[];
  warmthRating: number;
  waterproof: boolean;
  overallStyle: OverallStyle;
  weatherSummary?: string;
  userRating?: number;
};

export async function createOutfit(data: CreateOutfitInput): Promise<Outfit & { outfitItems: OutfitItem[] }> {
  // Validate all closetItemIds belong to userId
  const closetItems = await prisma.closetItem.findMany({
    where: {
      id: { in: data.outfitItems.map(item => item.closetItemId) },
      ownerId: data.userId
    }
  });
  if (closetItems.length !== data.outfitItems.length) {
    throw new Error('One or more closet items do not belong to user');
  }

  const outfit = await prisma.outfit.create({
    data: {
      userId: data.userId,
      warmthRating: data.warmthRating,
      waterproof: data.waterproof,
      overallStyle: data.overallStyle,
      weatherSummary: data.weatherSummary,
      userRating: data.userRating,
      outfitItems: {
        create: data.outfitItems.map(item => ({
          closetItem: { connect: { id: item.closetItemId } },
          layerCategory: item.layerCategory,
          sortOrder: item.sortOrder
        }))
      }
    },
    include: {
      outfitItems: true
    }
  });

  return outfit;
}

