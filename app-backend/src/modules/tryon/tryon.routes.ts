import { Router } from "express";
import { getItemFits, saveItemFit } from "./tryon.controller";
import { authenticateToken } from "../auth/auth.middleware";

const router = Router();

router.get("/fits", authenticateToken, getItemFits);
router.post("/fits", authenticateToken, saveItemFit);

export default router;
