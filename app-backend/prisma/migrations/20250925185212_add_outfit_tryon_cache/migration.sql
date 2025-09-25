-- AlterTable
ALTER TABLE "public"."Outfit" ADD COLUMN     "tryOnFinalUrl" TEXT,
ADD COLUMN     "tryOnGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "tryOnItemsHash" TEXT,
ADD COLUMN     "tryOnStepImageUrls" JSONB;
