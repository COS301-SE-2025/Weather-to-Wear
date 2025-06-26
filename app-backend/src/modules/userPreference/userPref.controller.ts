import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client"; 
import { AuthenticatedRequest } from "../auth/auth.middleware";

const prisma = new PrismaClient();
export default prisma;

// GET /api/preferences
export const getMyPreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const preference = await prisma.userPreference.findUnique({
      where: { userId },
    });

    if (!preference) {
      res.status(404).json({ message: "Preferences not found" });
      return;
    }

    res.status(200).json({
      style: preference.style,
      preferredColours: preference.preferredColours,
      learningWeight: preference.learningWeight,
    });
  } catch (error) {
    console.error("Error fetching preferences:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/preferences
export const updatePreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { style, preferredColours, learningWeight } = req.body;

    if (!style || !preferredColours || !Array.isArray(preferredColours)) {
      res.status(400).json({ message: "Invalid request body" });
      return;
    }

    if (preferredColours.length === 0 || preferredColours.length > 5) {
      res.status(400).json({ message: "Preferred colours must be between 1 and 5" });
      return;
    }

    const updatedPreference = await prisma.userPreference.upsert({
      where: { userId },
      update: { style, preferredColours, learningWeight },
      create: { userId, style, preferredColours, learningWeight },
    });

    res.status(200).json({
      style: updatedPreference.style,
      preferredColours: updatedPreference.preferredColours,
      learningWeight: updatedPreference.learningWeight,
    });
  } catch (error) {
    console.error("Error updating preferences:", error);
    res.status(500).json({ message: "Server error" });
  }
};