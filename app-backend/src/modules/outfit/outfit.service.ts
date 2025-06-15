import { PrismaClient, Outfit, OutfitItem, OverallStyle, LayerCategory } from '@prisma/client';

const prisma = new PrismaClient();

// -------------------------------
//           TYPES
// -------------------------------

// following needed for creating an outfit
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

// following needed for updating an outfit
type UpdateOutfitInput = {
  userId: string;
  outfitId: string;
  userRating?: number;
  outfitItems?: {
    closetItemId: string;
    layerCategory: LayerCategory;
    sortOrder: number;
  }[];
  overallStyle?: OverallStyle;
};


// -----------------------------------------------
//                  Outfit
// ----------------------------------------------

// Create an outfit 
export async function createOutfit(data: CreateOutfitInput): Promise<Outfit & { outfitItems: OutfitItem[] }> {
  // validate all closetItemIds belong to userId
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

// Get all outfits
export async function getAllOutfitsForUser(userId: string) {
  return prisma.outfit.findMany({
    where: { userId },
    include: {
      outfitItems: {
        include: {
          closetItem: true // include details about each clothing item
        }
      }
    }
  });
}

// Get single outfit
export async function getOutfitById(id: string, userId: string) {
  const outfit = await prisma.outfit.findUnique({
    where: { id },
    include: {
      outfitItems: {
        include: { closetItem: true }
      }
    }
  });
  if (!outfit || outfit.userId !== userId) throw new Error('Outfit not found or forbidden');
  return outfit;
}

// Update an outfit
export async function updateOutfit(data: UpdateOutfitInput) {
  // confirm outfit belongs to user
  const outfit = await prisma.outfit.findUnique({ where: { id: data.outfitId } });
  if (!outfit || outfit.userId !== data.userId) throw new Error('Outfit not found or forbidden');

  // if outfitItems array provided, remove all current and re-add (simplest for NOW)
  let updatedOutfit;
  if (data.outfitItems) {
    await prisma.outfitItem.deleteMany({ where: { outfitId: data.outfitId } });
    updatedOutfit = await prisma.outfit.update({
      where: { id: data.outfitId },
      data: {
        userRating: data.userRating,
        overallStyle: data.overallStyle,
        outfitItems: {
          create: data.outfitItems.map(item => ({
            closetItem: { connect: { id: item.closetItemId } },
            layerCategory: item.layerCategory,
            sortOrder: item.sortOrder
          }))
        }
      },
      include: {
        outfitItems: { include: { closetItem: true } }
      }
    });
  } else {
    updatedOutfit = await prisma.outfit.update({
      where: { id: data.outfitId },
      data: {
        userRating: data.userRating,
        overallStyle: data.overallStyle
      },
      include: {
        outfitItems: { include: { closetItem: true } }
      }
    });
  }
  return updatedOutfit;
}

// Delete an outfit
export async function deleteOutfit(userId: string, outfitId: string) {
  // Confirm outfit belongs to user
  const outfit = await prisma.outfit.findUnique({ where: { id: outfitId } });
  if (!outfit || outfit.userId !== userId) throw new Error('Outfit not found or forbidden');

  await prisma.outfitItem.deleteMany({ where: { outfitId } });
  await prisma.outfit.delete({ where: { id: outfitId } });
  return { success: true };
}


// -----------------------------------------------
//                Outfit Item
// -----------------------------------------------

// Get items for an outfit
export async function getItemsForOutfit(outfitId: string, userId: string) {
  // Check outfit belongs to user
  const outfit = await prisma.outfit.findUnique({ where: { id: outfitId } });
  if (!outfit || outfit.userId !== userId) throw new Error('Outfit not found or forbidden');
  return prisma.outfitItem.findMany({
    where: { outfitId },
    include: { closetItem: true }
  });
}

// Add item to an outfit
export async function addItemToOutfit(outfitId: string, userId: string, data: {
  closetItemId: string;
  layerCategory: LayerCategory;
  sortOrder: number;
}) {
  // Confirm outfit belongs to user
  const outfit = await prisma.outfit.findUnique({ where: { id: outfitId } });
  if (!outfit || outfit.userId !== userId) throw new Error('Outfit not found or forbidden');

  // Confirm closet item belongs to user
  const closetItem = await prisma.closetItem.findUnique({ where: { id: data.closetItemId } });
  if (!closetItem || closetItem.ownerId !== userId) throw new Error('Closet item not found or forbidden');

  return prisma.outfitItem.create({
    data: {
      outfitId,
      closetItemId: data.closetItemId,
      layerCategory: data.layerCategory,
      sortOrder: data.sortOrder
    }
  });
}

// Remove item from an outfit
export async function removeItemFromOutfit(outfitId: string, itemId: string, userId: string) {
  // Check the outfit and item belong to user
  const outfit = await prisma.outfit.findUnique({ where: { id: outfitId } });
  if (!outfit || outfit.userId !== userId) throw new Error('Outfit not found or forbidden');
  const item = await prisma.outfitItem.findUnique({ where: { id: itemId } });
  if (!item || item.outfitId !== outfitId) throw new Error('OutfitItem not found or forbidden');
  await prisma.outfitItem.delete({ where: { id: itemId } });
  return { success: true };
}