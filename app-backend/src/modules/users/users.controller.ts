// src/modules/users/users.controller.ts
import type { Request, Response, NextFunction } from "express";
import usersService from "./users.service";
// If Multer types complain, uncomment the next line:
// import "multer";

type AuthedFileRequest = Request & {
  user?: { id: string };
  file?: Express.Multer.File;
};

export const getMe = async (
  req: AuthedFileRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const user = await usersService.getById(userId);
    if (!user) {
      res.status(404).json({ message: "Not found" });
      return;
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
};

export const updateProfilePhoto = async (
  req: AuthedFileRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const publicPath = `/uploads/${req.file.filename}`;
    const user = await usersService.setProfilePhoto(userId, publicPath);

    res.status(200).json({ message: "Updated", user });
  } catch (err) {
    next(err);
  }
};
