-- CreateTable
CREATE TABLE "public"."InspoOutfit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "warmthRating" INTEGER NOT NULL,
    "waterproof" BOOLEAN NOT NULL,
    "overallStyle" "public"."OverallStyle" NOT NULL,
    "tags" TEXT[],
    "recommendedWeatherMin" INTEGER,
    "recommendedWeatherMax" INTEGER,
    "recommendedConditions" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "InspoOutfit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InspoItem" (
    "id" TEXT NOT NULL,
    "inspoOutfitId" TEXT NOT NULL,
    "closetItemId" TEXT NOT NULL,
    "layerCategory" "public"."LayerCategory" NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "InspoItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."InspoOutfit" ADD CONSTRAINT "InspoOutfit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InspoItem" ADD CONSTRAINT "InspoItem_inspoOutfitId_fkey" FOREIGN KEY ("inspoOutfitId") REFERENCES "public"."InspoOutfit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InspoItem" ADD CONSTRAINT "InspoItem_closetItemId_fkey" FOREIGN KEY ("closetItemId") REFERENCES "public"."closet_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
