-- CreateEnum
CREATE TYPE "Category" AS ENUM ('SHIRT', 'HOODIE', 'PANTS', 'SHORTS', 'SHOES', 'TSHIRT', 'LONGSLEEVE', 'SWEATER', 'JACKET', 'JEANS', 'BEANIE', 'HAT', 'SCARF', 'GLOVES', 'RAINCOAT', 'UMBRELLA');

-- CreateEnum
CREATE TYPE "Style" AS ENUM ('Formal', 'Casual', 'Athletic', 'Party', 'Business', 'Outdoor');

-- CreateEnum
CREATE TYPE "Material" AS ENUM ('Cotton', 'Wool', 'Polyester', 'Leather', 'Nylon', 'Fleece');

-- CreateEnum
CREATE TYPE "LayerCategory" AS ENUM ('base_top', 'base_bottom', 'mid_top', 'mid_bottom', 'outerwear', 'footwear', 'headwear', 'accessory');

-- CreateEnum
CREATE TYPE "OverallStyle" AS ENUM ('Formal', 'Casual', 'Athletic', 'Party', 'Business', 'Outdoor');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- AddForeignKey
ALTER TABLE "closet_items" ADD CONSTRAINT "closet_items_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outfit" ADD CONSTRAINT "Outfit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutfitItem" ADD CONSTRAINT "OutfitItem_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "Outfit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutfitItem" ADD CONSTRAINT "OutfitItem_closetItemId_fkey" FOREIGN KEY ("closetItemId") REFERENCES "closet_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
