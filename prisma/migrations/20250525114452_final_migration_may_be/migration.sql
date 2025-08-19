/*
  Warnings:

  - The values [BUDGET] on the enum `TransactionsType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `endDate` on the `Budget` table. All the data in the column will be lost.
  - You are about to drop the column `fkTransactionId` on the `Budget` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Budget` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Budget` table. All the data in the column will be lost.
  - You are about to drop the column `fkTransactionId` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `isUncategorized` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `fkTransactionId` on the `Income` table. All the data in the column will be lost.
  - You are about to drop the column `isUncategorized` on the `Income` table. All the data in the column will be lost.
  - You are about to drop the column `fkBudgetId` on the `Transactions` table. All the data in the column will be lost.
  - Added the required column `baseCurrency` to the `Budget` table without a default value. This is not possible if the table is not empty.
  - Added the required column `budgetAmountCurrency` to the `Budget` table without a default value. This is not possible if the table is not empty.
  - Added the required column `budgetAmountInBaseCurrency` to the `Budget` table without a default value. This is not possible if the table is not empty.
  - Added the required column `budgetAmountInCADCurrency` to the `Budget` table without a default value. This is not possible if the table is not empty.
  - Added the required column `budgetAmountInGivenCurrency` to the `Budget` table without a default value. This is not possible if the table is not empty.
  - Added the required column `baseCurrency` to the `Expense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expenseAmountCurrency` to the `Expense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expenseAmountInBaseCurrency` to the `Expense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expenseAmountInCADCurrency` to the `Expense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expenseAmountInGivenCurrency` to the `Expense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `baseCurrency` to the `Income` table without a default value. This is not possible if the table is not empty.
  - Added the required column `incomeAmountCurrency` to the `Income` table without a default value. This is not possible if the table is not empty.
  - Added the required column `incomeAmountInBaseCurrency` to the `Income` table without a default value. This is not possible if the table is not empty.
  - Added the required column `incomeAmountInCADCurrency` to the `Income` table without a default value. This is not possible if the table is not empty.
  - Added the required column `incomeAmountInGivenCurrency` to the `Income` table without a default value. This is not possible if the table is not empty.
  - Added the required column `categoryName` to the `Transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `partyName` to the `Transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BankOperationType" ADD VALUE 'SYNC';
ALTER TYPE "BankOperationType" ADD VALUE 'INCOME';
ALTER TYPE "BankOperationType" ADD VALUE 'EXPENSE';

-- AlterEnum
BEGIN;
CREATE TYPE "TransactionsType_new" AS ENUM ('INCOME', 'EXPENSE');
ALTER TABLE "Transactions" ALTER COLUMN "transactionType" TYPE "TransactionsType_new" USING ("transactionType"::text::"TransactionsType_new");
ALTER TYPE "TransactionsType" RENAME TO "TransactionsType_old";
ALTER TYPE "TransactionsType_new" RENAME TO "TransactionsType";
DROP TYPE "TransactionsType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Budget" DROP CONSTRAINT "Budget_fkTransactionId_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_fkTransactionId_fkey";

-- DropForeignKey
ALTER TABLE "Income" DROP CONSTRAINT "Income_fkTransactionId_fkey";

-- AlterTable
ALTER TABLE "Budget" DROP COLUMN "endDate",
DROP COLUMN "fkTransactionId",
DROP COLUMN "isActive",
DROP COLUMN "startDate",
ADD COLUMN     "CADCurrency" TEXT NOT NULL DEFAULT 'CAD',
ADD COLUMN     "baseCurrency" TEXT NOT NULL,
ADD COLUMN     "budgetAmountCurrency" TEXT NOT NULL,
ADD COLUMN     "budgetAmountInBaseCurrency" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "budgetAmountInCADCurrency" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "budgetAmountInGivenCurrency" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "fkTransactionId",
DROP COLUMN "isUncategorized",
ADD COLUMN     "CADCurrency" TEXT NOT NULL DEFAULT 'CAD',
ADD COLUMN     "baseCurrency" TEXT NOT NULL,
ADD COLUMN     "expenseAmountCurrency" TEXT NOT NULL,
ADD COLUMN     "expenseAmountInBaseCurrency" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "expenseAmountInCADCurrency" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "expenseAmountInGivenCurrency" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Income" DROP COLUMN "fkTransactionId",
DROP COLUMN "isUncategorized",
ADD COLUMN     "CADCurrency" TEXT NOT NULL DEFAULT 'CAD',
ADD COLUMN     "baseCurrency" TEXT NOT NULL,
ADD COLUMN     "incomeAmountCurrency" TEXT NOT NULL,
ADD COLUMN     "incomeAmountInBaseCurrency" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "incomeAmountInCADCurrency" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "incomeAmountInGivenCurrency" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Transactions" DROP COLUMN "fkBudgetId",
ADD COLUMN     "categoryName" TEXT NOT NULL,
ADD COLUMN     "isUncategorized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "partyName" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "BudgetLog" (
    "logId" SERIAL NOT NULL,
    "fkBudgetId" INTEGER NOT NULL,
    "fkUserId" INTEGER NOT NULL,
    "categoryName" TEXT NOT NULL,
    "budgetContributionCycle" "BudgetContributionCycle" NOT NULL,
    "budgetAmountInGivenCurrency" DOUBLE PRECISION NOT NULL,
    "budgetAmountCurrency" TEXT NOT NULL,
    "budgetAmountInBaseCurrency" DOUBLE PRECISION NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "budgetAmountInCADCurrency" DOUBLE PRECISION NOT NULL,
    "CADCurrency" TEXT NOT NULL DEFAULT 'CAD',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetLog_pkey" PRIMARY KEY ("logId")
);

-- AddForeignKey
ALTER TABLE "BudgetLog" ADD CONSTRAINT "BudgetLog_fkBudgetId_fkey" FOREIGN KEY ("fkBudgetId") REFERENCES "Budget"("budgetId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLog" ADD CONSTRAINT "BudgetLog_fkUserId_fkey" FOREIGN KEY ("fkUserId") REFERENCES "Users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_fkIncomeId_fkey" FOREIGN KEY ("fkIncomeId") REFERENCES "Income"("incomeId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_fkExpenseId_fkey" FOREIGN KEY ("fkExpenseId") REFERENCES "Expense"("expenseId") ON DELETE SET NULL ON UPDATE CASCADE;
