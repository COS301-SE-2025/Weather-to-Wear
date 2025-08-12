// src/modules/users/users.routes.ts
import { Router } from "express";
import multer from "multer";
import { updateProfilePhoto } from "./users.controller";
import { authenticateToken } from "../auth/auth.middleware";

const router = Router();

// ensure an uploads dir exists at project root (see note below)
const upload = multer({ dest: "uploads/" });

router.patch(
  "/me/profile-photo",
  authenticateToken,
  upload.single("image"),   // field name must match frontend
  updateProfilePhoto
);

export default router;
