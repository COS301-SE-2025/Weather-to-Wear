/*
  Warnings:

  - You are about to drop the `closet_items` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "LayerCategory" AS ENUM ('base_top', 'base_bottom', 'mid_top', 'mid_bottom', 'outerwear', 'footwear', 'headwear', 'accessory');

-- CreateEnum
CREATE TYPE "ClothingType" AS ENUM ('TShirt', 'LongSleeve', 'Sweater', 'Hoodie', 'Jacket', 'Pants', 'Jeans', 'Shorts', 'Shoes', 'Beanie', 'Hat', 'Scarf', 'Gloves', 'Raincoat', 'Umbrella');

-- CreateEnum
CREATE TYPE "Style" AS ENUM ('Formal', 'Casual', 'Athletic', 'Party', 'Business', 'Outdoor');

-- CreateEnum
CREATE TYPE "Material" AS ENUM ('Cotton', 'Wool', 'Polyester', 'Leather', 'Nylon', 'Fleece');

-- CreateEnum
CREATE TYPE "OverallStyle" AS ENUM ('Formal', 'Casual', 'Athletic');

-- DropForeignKey
ALTER TABLE "closet_items" DROP CONSTRAINT "closet_items_ownerId_fkey";

-- DropTable
DROP TABLE "closet_items";

-- DropEnum
DROP TYPE "Category";

-- CreateTable
CREATE TABLE "ClosetItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "layer" "LayerCategory" NOT NULL,
    "type" "ClothingType" NOT NULL,
    "filename" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "colorHex" TEXT NOT NULL,
    "warmthFactor" INTEGER NOT NULL,
    "waterproof" BOOLEAN NOT NULL,
    "style" "Style" NOT NULL,
    "material" "Material" NOT NULL,

    CONSTRAINT "ClosetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outfit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weatherSummary" TEXT,
    "warmthRating" INTEGER NOT NULL,
    "waterproof" BOOLEAN NOT NULL,
    "userRating" INTEGER,
    "overallStyle" "OverallStyle" NOT NULL,

    CONSTRAINT "Outfit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutfitItem" (
    "id" TEXT NOT NULL,
    "outfitId" TEXT NOT NULL,
    "closetItemId" TEXT NOT NULL,
    "layerCategory" "LayerCategory" NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "OutfitItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "weather" TEXT,
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3) NOT NULL,
    "style" "Style" NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "style" "Style" NOT NULL,
    "preferredColours" JSONB NOT NULL,
    "learningWeight" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- AddForeignKey
ALTER TABLE "ClosetItem" ADD CONSTRAINT "ClosetItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outfit" ADD CONSTRAINT "Outfit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutfitItem" ADD CONSTRAINT "OutfitItem_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "Outfit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutfitItem" ADD CONSTRAINT "OutfitItem_closetItemId_fkey" FOREIGN KEY ("closetItemId") REFERENCES "ClosetItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
