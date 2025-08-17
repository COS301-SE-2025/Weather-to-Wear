// packing.controller.ts
import { Request, Response } from 'express';
import * as packingService from './packing.service';
import prisma from '../../prisma';

export interface AuthUser {
  id: string;
  email?: string;
}
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// Create packing list for a trip
export const createPackingList = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { user } = req;
    if (!user?.id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const {
      tripId,
      items = [],
      outfits = [],
      others = [],
    }: {
      tripId?: string;
      items?: string[];
      outfits?: string[];
      others?: string[];
    } = req.body;

    if (!tripId) {
      res.status(400).json({ message: "Missing tripId" });
      return;
    }
    if (!Array.isArray(items) || !Array.isArray(outfits) || !Array.isArray(others)) {
      res.status(400).json({ message: "items, outfits, and others must be arrays" });
      return;
    }

    const packingList = await packingService.createPackingList(
      user.id,
      tripId,
      items,
      outfits,
      others
    );

    res.status(201).json(packingList);
  } catch (error: any) {
    console.error("Error creating packing list:", error);
    const msg = error?.code === "P2002"
      ? "A packing list already exists for this trip."
      : error?.message ?? "Error creating packing list";
    res.status(error?.statusCode ?? 500).json({ message: msg });
  }
};

// Get packing list for a trip
export const getPackingList = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { user } = req;
    if (!user?.id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { tripId } = req.params;
    if (!tripId) {
      res.status(400).json({ message: "Missing tripId" });
      return;
    }

    const packingList = await packingService.getPackingList(user.id, tripId);
    if (!packingList) {
      res.status(404).json({ message: "Packing list not found" });
      return;
    }
    res.json(packingList);
  } catch (error: any) {
    console.error("Error fetching packing list:", error);
    res.status(500).json({ message: error?.message ?? "Error fetching packing list" });
  }
};

// Update packing list (mark items packed/unpacked)
export const updatePackingList = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { user } = req;
    if (!user?.id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { listId } = req.params;
    const {
      items = [],
      outfits = [],
      others = [],
    }: {
      items?: Array<{ id: string; packed: boolean }>;
      outfits?: Array<{ id: string; packed: boolean }>;
      others?: Array<{ id: string; packed: boolean }>;
    } = req.body;

    if (!listId) {
      res.status(400).json({ message: "Missing listId" });
      return;
    }
    if (!Array.isArray(items) || !Array.isArray(outfits) || !Array.isArray(others)) {
      res.status(400).json({ message: "items, outfits, and others must be arrays" });
      return;
    }

    const updatedList = await packingService.updatePackingList(
      user.id,
      listId,
      items,
      outfits,
      others
    );
    res.json(updatedList);
  } catch (error: any) {
    console.error("Error updating packing list:", error);
    const code = error?.statusCode ?? 500;
    res.status(code).json({ message: error?.message ?? "Error updating packing list" });
  }
};

// Delete packing list
export const deletePackingList = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { user } = req;
    if (!user?.id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { listId } = req.params;
    if (!listId) {
      res.status(400).json({ message: "Missing listId" });
      return;
    }

    await packingService.deletePackingList(user.id, listId);
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting packing list:", error);
    const code = error?.statusCode ?? 500;
    res.status(code).json({ message: error?.message ?? "Error deleting packing list" });
  }
};