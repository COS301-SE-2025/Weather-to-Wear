import prisma from '../../prisma';

// Create packing list for a trip
export const createPackingList = async (userId: string, tripId: string, items: string[], outfits: string[], others: string[]) => {
  return prisma.packingList.create({
    data: {
      userId,
      tripId,
      items: {
        create: items.map(itemId => ({
          closetItemId: itemId,
          packed: false
        }))
      },
      outfits: {
        create: outfits.map(outfitId => ({
          outfitId,
          packed: false
        }))
      },
      others: {
        create: others.map(text => ({
          label: text,
          packed: false
        }))
      }
    },
    include: {
      items: true,
      outfits: true,
      others: true
    }
  });
};

// Get packing list for a trip
export const getPackingList = async (userId: string, tripId: string) => {
  return prisma.packingList.findFirst({
    where: { userId, tripId },
    include: {
      items: { include: { closetItem: true } },
      outfits: { include: { outfit: true } },
      others: true
    }
  });
};

// Update packing list
export const updatePackingList = async (userId: string, listId: string, items: any[], outfits: any[], others: any[]) => {
  return prisma.packingList.update({
    where: { id: listId, userId },
    data: {
      items: {
        updateMany: items.map(i => ({
          where: { id: i.id },
          data: { packed: i.packed }
        }))
      },
      outfits: {
        updateMany: outfits.map(o => ({
          where: { id: o.id },
          data: { packed: o.packed }
        }))
      },
      others: {
        updateMany: others.map(x => ({
          where: { id: x.id },
          data: { packed: x.packed }
        }))
      }
    },
    include: {
      items: true,
      outfits: true,
      others: true
    }
  });
};

// Delete packing list
export const deletePackingList = async (userId: string, listId: string) => {
  return prisma.packingList.delete({
    where: { id: listId, userId }
  });
};
