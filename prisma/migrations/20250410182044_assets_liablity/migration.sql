-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('Asset', 'Liability');

-- AlterEnum
ALTER TYPE "AccountType" ADD VALUE 'DEBIT';

-- CreateTable
CREATE TABLE "FinancialItems" (
    "itemId" SERIAL NOT NULL,
    "fkUserId" INTEGER NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemType" "ItemType" NOT NULL DEFAULT 'Asset',
    "givenAmount" DOUBLE PRECISION NOT NULL,
    "givenCurrencyCode" TEXT NOT NULL DEFAULT 'CAD',
    "givenCurrencyName" TEXT NOT NULL DEFAULT 'Canadian Dollar',
    "amountInDefaultCurrency" DOUBLE PRECISION,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'CAD',
    "exchangeRateForBaseCurrency" DOUBLE PRECISION,
    "amountInCADCurrency" DOUBLE PRECISION,
    "exchangeRateForCAD" DOUBLE PRECISION,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialItems_pkey" PRIMARY KEY ("itemId")
);

-- CreateIndex
CREATE INDEX "FinancialItems_itemId_idx" ON "FinancialItems"("itemId");

-- CreateIndex
CREATE INDEX "FinancialItems_fkUserId_idx" ON "FinancialItems"("fkUserId");

-- AddForeignKey
ALTER TABLE "FinancialItems" ADD CONSTRAINT "FinancialItems_fkUserId_fkey" FOREIGN KEY ("fkUserId") REFERENCES "Users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
