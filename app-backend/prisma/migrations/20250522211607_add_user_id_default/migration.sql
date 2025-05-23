/*
  Warnings:

  - You are about to drop the column `userId` on the `ClothingImage` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ClothingImage" DROP CONSTRAINT "ClothingImage_userId_fkey";

-- AlterTable
ALTER TABLE "ClothingImage" DROP COLUMN "userId";
