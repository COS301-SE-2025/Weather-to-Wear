-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."Category" ADD VALUE 'SLEEVELESS';
ALTER TYPE "public"."Category" ADD VALUE 'SKIRT';
ALTER TYPE "public"."Category" ADD VALUE 'BLAZER';
ALTER TYPE "public"."Category" ADD VALUE 'COAT';
ALTER TYPE "public"."Category" ADD VALUE 'BOOTS';
ALTER TYPE "public"."Category" ADD VALUE 'SANDALS';
ALTER TYPE "public"."Category" ADD VALUE 'HEELS';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."Material" ADD VALUE 'Denim';
ALTER TYPE "public"."Material" ADD VALUE 'Linen';
ALTER TYPE "public"."Material" ADD VALUE 'Silk';
ALTER TYPE "public"."Material" ADD VALUE 'Suede';
ALTER TYPE "public"."Material" ADD VALUE 'Fabric';
