import prisma from "../../prisma";
import { Prisma } from "@prisma/client";
import { ItemFitDTO } from "./tryon.types";

export async function getFits(userId: string, poseId: string, itemIds: string[]) {
  const fits = await prisma.itemFit.findMany({
    where: { userId, poseId, itemId: { in: itemIds } },
  });
  return fits.map(f => ({
    userId: f.userId,
    itemId: f.itemId,
    poseId: f.poseId,
    transform: { x: f.x, y: f.y, scale: f.scale, rotationDeg: f.rotationDeg },
    mesh: (f.meshJson as any) ?? undefined,
    updatedAt: f.updatedAt,
  }));
}

export async function upsertFit(dto: ItemFitDTO) {
  const { userId, itemId, poseId, transform, mesh } = dto;
  const saved = await prisma.itemFit.upsert({
    where: { userId_itemId_poseId: { userId, itemId, poseId } },
    update: {
      x: transform.x,
      y: transform.y,
      scale: transform.scale,
      rotationDeg: transform.rotationDeg,
      meshJson: (mesh ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    },
    create: {
      userId,
      itemId,
      poseId,
      x: transform.x,
      y: transform.y,
      scale: transform.scale,
      rotationDeg: transform.rotationDeg,
      meshJson: (mesh ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    },
  });
  return saved;
}
