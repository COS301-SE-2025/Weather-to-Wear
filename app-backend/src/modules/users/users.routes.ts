import { Router } from "express";
// if esModuleInterop=false, use: import * as multer from "multer";
import multer from "multer";
import { updateProfilePhoto } from "./users.controller";
import { authenticateToken } from "../auth/auth.middleware";

const router = Router();
const upload = multer({ dest: "uploads/" });

router.patch(
  "/me/profile-photo",
  authenticateToken,
  upload.single("image"),
  updateProfilePhoto
);

export default router;
