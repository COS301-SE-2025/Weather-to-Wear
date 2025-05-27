-- CreateEnum
CREATE TYPE "Category" AS ENUM ('SHIRT', 'HOODIE', 'PANTS', 'SHORTS', 'SHOES');

-- CreateTable
CREATE TABLE "closet_items" (
    "id" TEXT NOT NULL,
    "image" BYTEA NOT NULL,
    "category" "Category" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "closet_items_pkey" PRIMARY KEY ("id")
);
