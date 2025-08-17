// packing.service.ts
import prisma from '../../prisma';

// Create packing list for a trip
export const createPackingList = async (
  userId: string,
  tripId: string,
  items: string[] = [],
  outfits: string[] = [],
  others: string[] = []
) => {
  if (!userId) throw withCode(400, "Missing userId");
  if (!tripId) throw withCode(400, "Missing tripId");

  const trip = await prisma.event.findFirst({
    where: { id: tripId, userId  },
    select: { id: true },
  });
  if (!trip) throw withCode(404, "Trip not found or not owned by user");

  if (items?.length) {
    const cnt = await prisma.closetItem.count({
      where: { id: { in: items }, ownerId: userId },
    });
    if (cnt !== items.length) throw withCode(400, "One or more closet item IDs are invalid or not owned by user");
  }
  if (outfits?.length) {
    const cnt = await prisma.outfit.count({
      where: { id: { in: outfits }, userId },
    });
    if (cnt !== outfits.length) throw withCode(400, "One or more outfit IDs are invalid or not owned by user");
  }

  try {
    return await prisma.packingList.create({
      data: {
        userId,
        tripId,
        items: {
          create: (items ?? []).map((closetItemId) => ({ closetItemId, packed: false })),
        },
        outfits: {
          create: (outfits ?? []).map((outfitId) => ({ outfitId, packed: false })),
        },
        others: {
          create: (others ?? []).map((label) => ({ label, packed: false })),
        },
      },
      include: {
        items: { include: { closetItem: true } },
        outfits: { include: { outfit: true } },
        others: true,
      },
    });
  } catch (e: any) {
    if (e?.code === "P2002") throw withCode(409, "A packing list already exists for this trip");
    throw e;
  }
};

// Get packing list for a trip
export const getPackingList = async (userId: string, tripId: string) => {
  if (!userId) throw withCode(400, "Missing userId");
  if (!tripId) throw withCode(400, "Missing tripId");

  return prisma.packingList.findFirst({
    where: { userId, tripId },
    include: {
      items: { include: { closetItem: true } },
      outfits: { include: { outfit: true } },
      others: true,
    },
  });
};

// Update packing list
export const updatePackingList = async (
  userId: string,
  listId: string,
  items: Array<{ id: string; packed: boolean }> = [],
  outfits: Array<{ id: string; packed: boolean }> = [],
  others: Array<{ id: string; packed: boolean }> = []
) => {
  if (!userId) throw withCode(400, "Missing userId");
  if (!listId) throw withCode(400, "Missing listId");

  const exists = await prisma.packingList.findFirst({
    where: { id: listId, userId },
    select: { id: true },
  });
  if (!exists) throw withCode(404, "Packing list not found");

  return prisma.packingList.update({
    where: { id: listId },
    data: {
      ...(items?.length
        ? {
            items: {
              updateMany: items.map((i) => ({
                where: { id: i.id },
                data: { packed: i.packed },
              })),
            },
          }
        : {}),
      ...(outfits?.length
        ? {
            outfits: {
              updateMany: outfits.map((o) => ({
                where: { id: o.id },
                data: { packed: o.packed },
              })),
            },
          }
        : {}),
      ...(others?.length
        ? {
            others: {
              updateMany: others.map((x) => ({
                where: { id: x.id },
                data: { packed: x.packed },
              })),
            },
          }
        : {}),
    },
    include: {
      items: { include: { closetItem: true } },
      outfits: { include: { outfit: true } },
      others: true,
    },
  });
};

// Delete packing list
export const deletePackingList = async (userId: string, listId: string) => {
  if (!userId) throw withCode(400, "Missing userId");
  if (!listId) throw withCode(400, "Missing listId");

  const exists = await prisma.packingList.findFirst({
    where: { id: listId, userId },
    select: { id: true },
  });
  if (!exists) throw withCode(404, "Packing list not found");

  await prisma.$transaction([
    prisma.packingItem.deleteMany({ where: { packingListId: listId } }),
    prisma.packingOutfit.deleteMany({ where: { packingListId: listId } }),
    prisma.packingOther.deleteMany({ where: { packingListId: listId } }),
    prisma.packingList.delete({ where: { id: listId } }),
  ]);

  return true;
};

// Small helper to attach HTTP-like status codes to thrown errors
function withCode(statusCode: number, message: string) {
  const err = new Error(message) as any;
  err.statusCode = statusCode;
  return err;
}