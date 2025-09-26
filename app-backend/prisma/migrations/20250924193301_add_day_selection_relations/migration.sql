-- CreateTable
CREATE TABLE "public"."DaySelection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "style" "public"."Style",
    "items" JSONB NOT NULL,
    "weatherAvg" DOUBLE PRECISION,
    "weatherMin" DOUBLE PRECISION,
    "weatherMax" DOUBLE PRECISION,
    "willRain" BOOLEAN,
    "mainCondition" TEXT,
    "outfitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DaySelection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DaySelection_userId_date_key" ON "public"."DaySelection"("userId", "date");

-- AddForeignKey
ALTER TABLE "public"."DaySelection" ADD CONSTRAINT "DaySelection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DaySelection" ADD CONSTRAINT "DaySelection_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "public"."Outfit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
