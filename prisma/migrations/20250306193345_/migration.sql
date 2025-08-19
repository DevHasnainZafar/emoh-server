-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'BUDGET');

-- CreateEnum
CREATE TYPE "IncomeCategory" AS ENUM ('Salary', 'HouseRent', 'Business', 'Dividend');

-- CreateEnum
CREATE TYPE "BudgetCategory" AS ENUM ('Groceries', 'Shopping', 'Rent', 'Utilities');

-- CreateEnum
CREATE TYPE "RecurringType" AS ENUM ('NoRecurring', 'Yearly', 'Monthly', 'Weekly', 'Biweekly', 'Custom');

-- CreateEnum
CREATE TYPE "CustomRecurringInterval" AS ENUM ('Day', 'Days', 'Week', 'Biweek', 'Month', 'Quarter', 'Year');

-- CreateEnum
CREATE TYPE "CustomRecurringDays" AS ENUM ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');

-- CreateEnum
CREATE TYPE "BudgetContributionCycle" AS ENUM ('Daily', 'Weekly', 'Monthly', 'Yearly');

-- CreateEnum
CREATE TYPE "TransactionsType" AS ENUM ('INCOME', 'EXPENSE', 'BUDGET');

-- CreateEnum
CREATE TYPE "BankOperationType" AS ENUM ('ADD', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('Saving', 'Chequing', 'Business', 'Investment');

-- CreateEnum
CREATE TYPE "InclusionStatus" AS ENUM ('Included', 'Excluded', 'Out_Of_Scope');

-- CreateTable
CREATE TABLE "Banks" (
    "bankId" SERIAL NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL DEFAULT 'Saving',
    "accountImage" TEXT NOT NULL,
    "accountAmount" DOUBLE PRECISION NOT NULL,
    "accountCurrencyCode" TEXT NOT NULL DEFAULT 'CAD',
    "accountCurrencyName" TEXT NOT NULL DEFAULT 'Canadian Dollar',
    "accountAmountInDefaultCurrency" DOUBLE PRECISION,
    "exchangeRateForBaseCurrency" DOUBLE PRECISION,
    "accountAmountInCADCurrency" DOUBLE PRECISION,
    "exchangeRateForCAD" DOUBLE PRECISION,
    "isPlaidAccount" BOOLEAN NOT NULL DEFAULT false,
    "plaidAccountId" TEXT,
    "plaidItemId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "fkUserId" INTEGER NOT NULL,

    CONSTRAINT "Banks_pkey" PRIMARY KEY ("bankId")
);

-- CreateTable
CREATE TABLE "BankHistory" (
    "bankHistoryId" SERIAL NOT NULL,
    "bankId" INTEGER NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL DEFAULT 'Saving',
    "accountImage" TEXT NOT NULL,
    "accountAmount" DOUBLE PRECISION NOT NULL,
    "accountCurrencyCode" TEXT NOT NULL,
    "accountCurrencyName" TEXT NOT NULL,
    "accountAmountInDefaultCurrency" DOUBLE PRECISION,
    "exchangeRateForBaseCurrency" DOUBLE PRECISION,
    "accountAmountInCADCurrency" DOUBLE PRECISION,
    "exchangeRateForCAD" DOUBLE PRECISION,
    "isPlaidAccount" BOOLEAN NOT NULL DEFAULT false,
    "plaidAccountId" TEXT,
    "plaidItemId" TEXT,
    "isArchived" BOOLEAN NOT NULL,
    "BankOperationType" "BankOperationType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fkUserId" INTEGER NOT NULL,

    CONSTRAINT "BankHistory_pkey" PRIMARY KEY ("bankHistoryId")
);

-- CreateTable
CREATE TABLE "Budget" (
    "budgetId" SERIAL NOT NULL,
    "fkUserId" INTEGER NOT NULL,
    "fkCategoryId" INTEGER NOT NULL,
    "fkTransactionId" INTEGER NOT NULL,
    "budgetContributionCycle" "BudgetContributionCycle" NOT NULL,
    "nextDueDate" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("budgetId")
);

-- CreateTable
CREATE TABLE "Category" (
    "categoryId" SERIAL NOT NULL,
    "categoryType" "CategoryType" NOT NULL,
    "incomeCategory" "IncomeCategory",
    "budgetCategory" "BudgetCategory",
    "categoryImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("categoryId")
);

-- CreateTable
CREATE TABLE "Expense" (
    "expenseId" SERIAL NOT NULL,
    "fkUserId" INTEGER NOT NULL,
    "paidFrom" TEXT NOT NULL,
    "paidFromImage" TEXT NOT NULL,
    "paidTo" TEXT NOT NULL,
    "paidToCategory" TEXT NOT NULL,
    "taxStatus" "InclusionStatus" NOT NULL,
    "taxPercentage" INTEGER,
    "fxMarkupStatus" "InclusionStatus" NOT NULL,
    "fxMarkupValue" INTEGER,
    "expenseDate" TIMESTAMP(3),
    "recurringType" "RecurringType" NOT NULL,
    "nextDueDate" TIMESTAMP(3),
    "fkTransactionId" INTEGER NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("expenseId")
);

-- CreateTable
CREATE TABLE "Income" (
    "incomeId" SERIAL NOT NULL,
    "fkUserId" INTEGER NOT NULL,
    "receivedIn" TEXT NOT NULL,
    "receivedInBankImage" TEXT NOT NULL,
    "receivedFrom" TEXT NOT NULL,
    "fkCategoryId" INTEGER NOT NULL,
    "recurringType" "RecurringType" NOT NULL,
    "nextDueDate" TIMESTAMP(3),
    "customRecurringUnit" INTEGER,
    "customRecurringInterval" "CustomRecurringInterval",
    "customRecurringDays" "CustomRecurringDays"[],
    "customRecurringStartDate" TIMESTAMP(3),
    "customRecurringEndDate" TIMESTAMP(3),
    "incomeDate" TIMESTAMP(3),
    "fkTransactionId" INTEGER NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Income_pkey" PRIMARY KEY ("incomeId")
);

-- CreateTable
CREATE TABLE "NetWorthHistory" (
    "netWorthHistoryId" SERIAL NOT NULL,
    "fkUserId" INTEGER NOT NULL,
    "netWorthInCAD" DOUBLE PRECISION NOT NULL,
    "netWorthInDefaultCurrency" DOUBLE PRECISION NOT NULL,
    "defaultCurrency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NetWorthHistory_pkey" PRIMARY KEY ("netWorthHistoryId")
);

-- CreateTable
CREATE TABLE "Transactions" (
    "transactionId" SERIAL NOT NULL,
    "transactionType" "TransactionsType" NOT NULL,
    "amountInGivenCurrency" DOUBLE PRECISION NOT NULL,
    "amountCurrency" TEXT NOT NULL,
    "amountInBaseCurrency" DOUBLE PRECISION NOT NULL,
    "BaseCurrency" TEXT NOT NULL,
    "amountInCADCurrency" DOUBLE PRECISION NOT NULL,
    "CADCurrency" TEXT NOT NULL DEFAULT 'CAD',
    "exchangeRateForBaseCurrency" DOUBLE PRECISION,
    "exchangeRateForCAD" DOUBLE PRECISION,
    "fkIncomeId" INTEGER,
    "fkBudgetId" INTEGER,
    "fkExpenseId" INTEGER,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transactions_pkey" PRIMARY KEY ("transactionId")
);

-- CreateTable
CREATE TABLE "Users" (
    "userId" SERIAL NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "defaultCurrencyName" TEXT NOT NULL DEFAULT 'Canadian Dollar',
    "defaultCurrencyCode" TEXT NOT NULL DEFAULT 'CAD',
    "defaultLanguage" TEXT NOT NULL DEFAULT 'English',
    "password" TEXT,
    "regOtp" INTEGER,
    "regOTPExpiry" TIMESTAMP(3),
    "regOtpVerified" BOOLEAN DEFAULT false,
    "isProfileCreated" BOOLEAN NOT NULL DEFAULT false,
    "profilePic" TEXT,
    "accessToken" TEXT,
    "isGoogle" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "Banks_bankId_idx" ON "Banks"("bankId");

-- CreateIndex
CREATE INDEX "BankHistory_bankId_idx" ON "BankHistory"("bankId");

-- CreateIndex
CREATE INDEX "Category_categoryId_idx" ON "Category"("categoryId");

-- CreateIndex
CREATE INDEX "NetWorthHistory_fkUserId_createdAt_idx" ON "NetWorthHistory"("fkUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE INDEX "Users_userId_idx" ON "Users"("userId");

-- AddForeignKey
ALTER TABLE "Banks" ADD CONSTRAINT "Banks_fkUserId_fkey" FOREIGN KEY ("fkUserId") REFERENCES "Users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankHistory" ADD CONSTRAINT "BankHistory_fkUserId_fkey" FOREIGN KEY ("fkUserId") REFERENCES "Users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_fkUserId_fkey" FOREIGN KEY ("fkUserId") REFERENCES "Users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_fkCategoryId_fkey" FOREIGN KEY ("fkCategoryId") REFERENCES "Category"("categoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_fkTransactionId_fkey" FOREIGN KEY ("fkTransactionId") REFERENCES "Transactions"("transactionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_fkUserId_fkey" FOREIGN KEY ("fkUserId") REFERENCES "Users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_fkTransactionId_fkey" FOREIGN KEY ("fkTransactionId") REFERENCES "Transactions"("transactionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_fkUserId_fkey" FOREIGN KEY ("fkUserId") REFERENCES "Users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_fkCategoryId_fkey" FOREIGN KEY ("fkCategoryId") REFERENCES "Category"("categoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_fkTransactionId_fkey" FOREIGN KEY ("fkTransactionId") REFERENCES "Transactions"("transactionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetWorthHistory" ADD CONSTRAINT "NetWorthHistory_fkUserId_fkey" FOREIGN KEY ("fkUserId") REFERENCES "Users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
