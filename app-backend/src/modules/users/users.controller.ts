// src/modules/users/users.controller.ts
import { Request, Response, NextFunction, RequestHandler } from "express";
import usersService from "./users.service";
// If you see "Cannot find namespace 'Express'" for Multer types, uncomment the next line:
// import "multer";

type AuthedFileRequest = Request & {
  user?: { id: string };
  file?: Express.Multer.File;
};

export const updateProfilePhoto = async (
  req: AuthedFileRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return; // <- return void, not Response
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
