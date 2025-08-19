import { AccountType } from "@prisma/client";

export type BankAccountResponse = {
    bankAccount: {
      defaultCurrency: string;
      cadCurrency: string;
      accountAmount: number;
      accountCurrencyCode: string;
      accountType: AccountType;
      isPlaidAccount: boolean;
      accountImage: string;
      accountAmountInDefaultCurrency: number | null;
      exchangeRateForBaseCurrency: number | null;
      accountAmountInCADCurrency: number | null;
      exchangeRateForCAD: number | null;
      plaidAccountId: string | null;
      plaidItemId: string | null;
      isArchived: boolean;
      fkUserId: number;
    };
  };