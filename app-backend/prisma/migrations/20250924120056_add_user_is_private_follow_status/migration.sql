-- AlterTable
ALTER TABLE "public"."Follow" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false;
