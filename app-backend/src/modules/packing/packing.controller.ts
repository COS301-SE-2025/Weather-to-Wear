import { Request, Response } from 'express';
import * as packingService from './packing.service';

// Create packing list for a trip
export const createPackingList = async (req: Request, res: Response) => {
  try {
    const { tripId, items, outfits, others } = req.body;
    const userId = (req as any).user.id;

    const packingList = await packingService.createPackingList(userId, tripId, items, outfits, others);
    res.status(201).json(packingList);
  } catch (error) {
    console.error('Error creating packing list:', error);
    res.status(500).json({ message: 'Error creating packing list' });
  }
};

// Get packing list for a trip
export const getPackingList = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const userId = (req as any).user.id;

    const packingList = await packingService.getPackingList(userId, tripId);
    res.json(packingList);
  } catch (error) {
    console.error('Error fetching packing list:', error);
    res.status(500).json({ message: 'Error fetching packing list' });
  }
};

// Update packing list (mark items packed/unpacked)
export const updatePackingList = async (req: Request, res: Response) => {
  try {
    const { listId } = req.params;
    const { items, outfits, others } = req.body;
    const userId = (req as any).user.id;

    const updatedList = await packingService.updatePackingList(userId, listId, items, outfits, others);
    res.json(updatedList);
  } catch (error) {
    console.error('Error updating packing list:', error);
    res.status(500).json({ message: 'Error updating packing list' });
  }
};

// Delete packing list
export const deletePackingList = async (req: Request, res: Response) => {
  try {
    const { listId } = req.params;
    const userId = (req as any).user.id;

    await packingService.deletePackingList(userId, listId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting packing list:', error);
    res.status(500).json({ message: 'Error deleting packing list' });
  }
};
