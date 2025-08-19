/*
  Warnings:

  - The primary key for the `Transactions` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "Budget" DROP CONSTRAINT "Budget_fkTransactionId_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_fkTransactionId_fkey";

-- DropForeignKey
ALTER TABLE "Income" DROP CONSTRAINT "Income_fkTransactionId_fkey";

-- AlterTable
ALTER TABLE "Budget" ALTER COLUMN "fkTransactionId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Expense" ALTER COLUMN "fkTransactionId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Income" ALTER COLUMN "fkTransactionId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Transactions" DROP CONSTRAINT "Transactions_pkey",
ALTER COLUMN "transactionId" DROP DEFAULT,
ALTER COLUMN "transactionId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Transactions_pkey" PRIMARY KEY ("transactionId");
DROP SEQUENCE "Transactions_transactionId_seq";

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_fkTransactionId_fkey" FOREIGN KEY ("fkTransactionId") REFERENCES "Transactions"("transactionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_fkTransactionId_fkey" FOREIGN KEY ("fkTransactionId") REFERENCES "Transactions"("transactionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_fkTransactionId_fkey" FOREIGN KEY ("fkTransactionId") REFERENCES "Transactions"("transactionId") ON DELETE RESTRICT ON UPDATE CASCADE;
