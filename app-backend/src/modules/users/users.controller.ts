// src/modules/users/users.controller.ts
import type { Request, Response, NextFunction } from "express";
import usersService from "./users.service";
import { cdnUrlFor, uploadBufferToS3 } from '../../utils/s3';
import { randomUUID } from 'crypto';

function extFromMime(m: string) {
  if (m === 'image/png') return '.png';
  if (m === 'image/jpeg' || m === 'image/jpg') return '.jpg';
  if (m === 'image/webp') return '.webp';
  return '.bin';
}

type AuthedFileRequest = Request & {
  user?: { id: string };
  file?: Express.Multer.File;
};

export const getMe = async (req: AuthedFileRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

    const user = await usersService.getById(userId);
    if (!user) { res.status(404).json({ message: "Not found" }); return; }

    res.json({ user });
  } catch (err) {
    next(err);
  }
};

// export const updateProfilePhoto = async (
//   req: AuthedFileRequest,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     if (!req.file) {
//       res.status(400).json({ message: "No file uploaded" });
//       return;
//     }

//     const userId = req.user?.id;
//     if (!userId) {
//       res.status(401).json({ message: "Unauthorized" });
//       return;
//     }

//     const publicPath = `/uploads/${req.file.filename}`;
//     const user = await usersService.setProfilePhoto(userId, publicPath);

//     res.status(200).json({ message: "Updated", user });
//   } catch (err) {
//     next(err);
//   }
// };

// hosted update pp
export const updateProfilePhoto = async (req: AuthedFileRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) { res.status(400).json({ message: 'No file uploaded' }); return; }
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const ext = extFromMime(req.file.mimetype);
    const key = `users/${userId}/profile/${Date.now()}-${randomUUID()}${ext}`;
    await uploadBufferToS3({
      bucket: process.env.S3_BUCKET_NAME!,
      key,
      contentType: req.file.mimetype || 'application/octet-stream',
      body: req.file.buffer,
    });

    const publicUrl = cdnUrlFor(key);
    const user = await usersService.setProfilePhoto(userId, publicUrl);
    res.status(200).json({ message: 'Updated', user });
  } catch (err) {
    next(err);
  }
};