/*
  Warnings:

  - You are about to drop the column `accountCurrencyName` on the `BankHistory` table. All the data in the column will be lost.
  - You are about to drop the column `accountCurrencyName` on the `Banks` table. All the data in the column will be lost.
  - You are about to drop the column `isUncategorized` on the `Budget` table. All the data in the column will be lost.
  - You are about to drop the column `givenCurrencyName` on the `FinancialItems` table. All the data in the column will be lost.
  - Added the required column `fkBankId` to the `Expense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fkBankId` to the `Income` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fkUserId` to the `Transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BankHistory" DROP COLUMN "accountCurrencyName",
ADD COLUMN     "creditAccountLiabilityInCAD" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "creditAccountLiabilityInDefaultCurrency" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "isCreditAccount" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Banks" DROP COLUMN "accountCurrencyName",
ADD COLUMN     "creditAccountLiabilityInCAD" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "creditAccountLiabilityInDefaultCurrency" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "isCreditAccount" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Budget" DROP COLUMN "isUncategorized",
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "startDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "fkBankId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "FinancialItems" DROP COLUMN "givenCurrencyName";

-- AlterTable
ALTER TABLE "Income" ADD COLUMN     "fkBankId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Transactions" ADD COLUMN     "fkBankId" INTEGER,
ADD COLUMN     "fkUserId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_fkBankId_fkey" FOREIGN KEY ("fkBankId") REFERENCES "Banks"("bankId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_fkBankId_fkey" FOREIGN KEY ("fkBankId") REFERENCES "Banks"("bankId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_fkUserId_fkey" FOREIGN KEY ("fkUserId") REFERENCES "Users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_fkBankId_fkey" FOREIGN KEY ("fkBankId") REFERENCES "Banks"("bankId") ON DELETE SET NULL ON UPDATE CASCADE;
