// src/modules/users/users.routes.ts
import { Router, type RequestHandler } from "express";
import { updateProfilePhoto, getMe } from "./users.controller";
import { authenticateToken } from "../auth/auth.middleware";
import { memoryUpload } from '../../middleware/upload.middleware'; // ⬅️ use memory

const router = Router();

router.get("/me", authenticateToken as RequestHandler, getMe as unknown as RequestHandler);

router.patch(
  "/me/profile-photo",
  authenticateToken as RequestHandler,
  memoryUpload.single('image'), // ⬅️ memory, so req.file.buffer exists
  updateProfilePhoto as unknown as RequestHandler
);

export default router;