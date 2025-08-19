-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "isUncategorized" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "isUncategorized" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Income" ADD COLUMN     "isUncategorized" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PlaidCategoryMapping" (
    "id" SERIAL NOT NULL,
    "plaidCategory" TEXT NOT NULL,
    "customCategory" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaidCategoryMapping_pkey" PRIMARY KEY ("id")
);
