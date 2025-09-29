// src/modules/users/users.controller.ts
import type { Request, Response, NextFunction } from "express";
import usersService from "./users.service";
import { cdnUrlFor, uploadBufferToS3, putBufferSmart } from '../../utils/s3';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';

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

async function fileBuffer(f: Express.Multer.File): Promise<Buffer> {
  if (f.buffer) return f.buffer;               // memory storage
  if (f.path) return fs.readFile(f.path);      // disk storage fallback
  throw new Error('No file buffer or path provided by Multer');
}

export const updateProfilePhoto = async (req: AuthedFileRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) { res.status(400).json({ message: 'No file uploaded' }); return; }
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const ext = extFromMime(req.file.mimetype);
    const key = `users/${userId}/profile/${Date.now()}-${randomUUID()}${ext}`;

    const body = await fileBuffer(req.file);
    // await uploadBufferToS3({
    //   bucket: process.env.S3_BUCKET_NAME!,
    //   key,
    //   contentType: req.file.mimetype || 'application/octet-stream',
    //   body,
    // });

    const { publicUrl } = await putBufferSmart({
      key,
      contentType: req.file.mimetype || 'application/octet-stream',
      body,
    });
    const user = await usersService.setProfilePhoto(userId, publicUrl);
    res.status(200).json({ message: 'Updated', user });
  } catch (err) {
    next(err);
  }
};

// Update privacy controller
export const updatePrivacy = async (req: AuthedFileRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { isPrivate } = req.body;
    if (typeof isPrivate !== "boolean") {
      return res.status(400).json({ message: "Invalid value for isPrivate" });
    }

    const user = await usersService.setPrivacy(userId, isPrivate);
    res.status(200).json({ message: "Privacy updated", user });
  } catch (err) {
    next(err);
  }
};

