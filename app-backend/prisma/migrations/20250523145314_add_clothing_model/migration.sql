/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Category" AS ENUM ('HOODIE', 'PANTS', 'SHORTS', 'SHIRT', 'SHOES');

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "Clothing" (
    "id" SERIAL NOT NULL,
    "imagePath" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clothing_pkey" PRIMARY KEY ("id")
);
