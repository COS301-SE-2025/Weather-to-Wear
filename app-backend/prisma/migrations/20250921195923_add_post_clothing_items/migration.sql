-- CreateTable
CREATE TABLE "public"."PostItem" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "closetItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PostItem_postId_closetItemId_key" ON "public"."PostItem"("postId", "closetItemId");

-- AddForeignKey
ALTER TABLE "public"."PostItem" ADD CONSTRAINT "PostItem_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostItem" ADD CONSTRAINT "PostItem_closetItemId_fkey" FOREIGN KEY ("closetItemId") REFERENCES "public"."closet_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
