import { Request, Response } from "express";
import { getFits, upsertFit } from "./tryon.service";
import { ItemFitDTO } from "./tryon.types";

export async function getItemFits(req: Request, res: Response): Promise<void> {
    // auth middleware should set req.userId (as your other routes do)
    const userId = (req as any).user?.id as string;
    const poseId = (req.query.poseId as string) || "front_v1";
    const itemsParam = (req.query.itemIds as string) || "";
    const itemIds = itemsParam.split(",").map(s => s.trim()).filter(Boolean);
    if (!userId || !poseId || itemIds.length === 0) {
        res.status(400).json({ error: "Missing userId, poseId or itemIds" });
        return;
    }
    const fits = await getFits(userId, poseId, itemIds);
    res.json({ fits });
    return;
}

export async function saveItemFit(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.id as string;
    const body = req.body as ItemFitDTO;
    if (!userId || !body?.itemId || !body?.poseId || !body?.transform) {
        res.status(400).json({ error: "Missing required fields" });
        return;
    }
    const saved = await upsertFit({ ...body, userId }); // override to ensure security
    res.json({
        userId: saved.userId,
        itemId: saved.itemId,
        poseId: saved.poseId,
        transform: { x: saved.x, y: saved.y, scale: saved.scale, rotationDeg: saved.rotationDeg },
        mesh: (saved.meshJson as any) ?? undefined,
        updatedAt: saved.updatedAt,
    });
    return;
}
