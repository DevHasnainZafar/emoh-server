-- AlterTable
ALTER TABLE "BankHistory" ADD COLUMN     "last_sync_at" TIMESTAMP(3),
ADD COLUMN     "plaidInstitutionId" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Banks" ADD COLUMN     "last_sync_at" TIMESTAMP(3),
ADD COLUMN     "plaidInstitutionId" TEXT;
