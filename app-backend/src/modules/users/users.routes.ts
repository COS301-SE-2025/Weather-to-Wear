// src/modules/users/users.routes.ts
import { Router, type RequestHandler } from "express";
// import multer from "multer";
import { updateProfilePhoto, getMe } from "./users.controller";
import { authenticateToken } from "../auth/auth.middleware";
import { upload } from '../../middleware/upload.middleware';

const router = Router();
// const upload = multer({ dest: "uploads/" });

router.get("/me", authenticateToken as RequestHandler, getMe as unknown as RequestHandler);

router.patch(
  "/me/profile-photo",
  authenticateToken as RequestHandler,
  upload.single('image'),
  updateProfilePhoto as unknown as RequestHandler
);

export default router;
