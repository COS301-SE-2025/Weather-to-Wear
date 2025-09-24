-- CreateTable
CREATE TABLE "public"."ItemFit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "poseId" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "scale" DOUBLE PRECISION NOT NULL,
    "rotationDeg" DOUBLE PRECISION NOT NULL,
    "meshJson" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemFit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemFit_userId_poseId_idx" ON "public"."ItemFit"("userId", "poseId");

-- CreateIndex
CREATE INDEX "ItemFit_itemId_poseId_idx" ON "public"."ItemFit"("itemId", "poseId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemFit_userId_itemId_poseId_key" ON "public"."ItemFit"("userId", "itemId", "poseId");
