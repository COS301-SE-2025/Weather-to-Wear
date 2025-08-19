-- AlterTable
ALTER TABLE "public"."Event" ADD COLUMN     "isTrip" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."PackingList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackingList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PackingItem" (
    "id" TEXT NOT NULL,
    "packingListId" TEXT NOT NULL,
    "closetItemId" TEXT NOT NULL,
    "packed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PackingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PackingOutfit" (
    "id" TEXT NOT NULL,
    "packingListId" TEXT NOT NULL,
    "outfitId" TEXT NOT NULL,
    "packed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PackingOutfit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PackingOther" (
    "id" TEXT NOT NULL,
    "packingListId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "packed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PackingOther_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PackingList_tripId_key" ON "public"."PackingList"("tripId");

-- AddForeignKey
ALTER TABLE "public"."PackingList" ADD CONSTRAINT "PackingList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PackingList" ADD CONSTRAINT "PackingList_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "public"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PackingItem" ADD CONSTRAINT "PackingItem_packingListId_fkey" FOREIGN KEY ("packingListId") REFERENCES "public"."PackingList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PackingItem" ADD CONSTRAINT "PackingItem_closetItemId_fkey" FOREIGN KEY ("closetItemId") REFERENCES "public"."closet_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PackingOutfit" ADD CONSTRAINT "PackingOutfit_packingListId_fkey" FOREIGN KEY ("packingListId") REFERENCES "public"."PackingList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PackingOutfit" ADD CONSTRAINT "PackingOutfit_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "public"."Outfit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PackingOther" ADD CONSTRAINT "PackingOther_packingListId_fkey" FOREIGN KEY ("packingListId") REFERENCES "public"."PackingList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
