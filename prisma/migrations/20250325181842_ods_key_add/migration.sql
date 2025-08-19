/*
  Warnings:

  - You are about to drop the column `fkCategoryId` on the `Budget` table. All the data in the column will be lost.
  - You are about to drop the column `fkCategoryId` on the `Income` table. All the data in the column will be lost.
  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `categoryName` to the `Budget` table without a default value. This is not possible if the table is not empty.
  - Added the required column `categoryName` to the `Income` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Budget" DROP CONSTRAINT "Budget_fkCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "Income" DROP CONSTRAINT "Income_fkCategoryId_fkey";

-- AlterTable
ALTER TABLE "Budget" DROP COLUMN "fkCategoryId",
ADD COLUMN     "categoryName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "isPlaidExpense" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Income" DROP COLUMN "fkCategoryId",
ADD COLUMN     "categoryName" TEXT NOT NULL,
ADD COLUMN     "isPlaidIncome" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Transactions" ADD COLUMN     "isPlaidTransaction" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "Category";
