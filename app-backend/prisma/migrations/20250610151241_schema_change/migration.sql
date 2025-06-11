/*
  Warnings:

  - You are about to drop the `ClosetItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Category" AS ENUM ('SHIRT', 'HOODIE', 'PANTS', 'SHORTS', 'SHOES', 'TSHIRT', 'LONGSLEEVE', 'SWEATER', 'JACKET', 'JEANS', 'BEANIE', 'HAT', 'SCARF', 'GLOVES', 'RAINCOAT', 'UMBRELLA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OverallStyle" ADD VALUE 'Party';
ALTER TYPE "OverallStyle" ADD VALUE 'Business';
ALTER TYPE "OverallStyle" ADD VALUE 'Outdoor';

-- DropForeignKey
ALTER TABLE "ClosetItem" DROP CONSTRAINT "ClosetItem_userId_fkey";

-- DropForeignKey
ALTER TABLE "OutfitItem" DROP CONSTRAINT "OutfitItem_closetItemId_fkey";

-- DropTable
DROP TABLE "ClosetItem";

-- DropEnum
DROP TYPE "ClothingType";

-- CreateTable
CREATE TABLE "closet_items" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "colorHex" TEXT,
    "warmthFactor" INTEGER,
    "waterproof" BOOLEAN,
    "style" "Style",
    "material" "Material",
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "closet_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "closet_items" ADD CONSTRAINT "closet_items_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutfitItem" ADD CONSTRAINT "OutfitItem_closetItemId_fkey" FOREIGN KEY ("closetItemId") REFERENCES "closet_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
