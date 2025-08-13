-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "isTrip" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PackingList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackingList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingItem" (
    "id" TEXT NOT NULL,
    "packingListId" TEXT NOT NULL,
    "closetItemId" TEXT NOT NULL,
    "packed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PackingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingOutfit" (
    "id" TEXT NOT NULL,
    "packingListId" TEXT NOT NULL,
    "outfitId" TEXT NOT NULL,
    "packed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PackingOutfit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingOther" (
    "id" TEXT NOT NULL,
    "packingListId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "packed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PackingOther_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PackingList_tripId_key" ON "PackingList"("tripId");

-- AddForeignKey
ALTER TABLE "PackingList" ADD CONSTRAINT "PackingList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingList" ADD CONSTRAINT "PackingList_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingItem" ADD CONSTRAINT "PackingItem_packingListId_fkey" FOREIGN KEY ("packingListId") REFERENCES "PackingList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingItem" ADD CONSTRAINT "PackingItem_closetItemId_fkey" FOREIGN KEY ("closetItemId") REFERENCES "closet_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingOutfit" ADD CONSTRAINT "PackingOutfit_packingListId_fkey" FOREIGN KEY ("packingListId") REFERENCES "PackingList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingOutfit" ADD CONSTRAINT "PackingOutfit_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "Outfit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingOther" ADD CONSTRAINT "PackingOther_packingListId_fkey" FOREIGN KEY ("packingListId") REFERENCES "PackingList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
