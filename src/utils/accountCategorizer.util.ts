import { AccountType } from '@prisma/client';

export function isAssetAccount(accountType: AccountType): boolean {
  return [
    'Saving',
    'Chequing',
    'Investment',
    'Business',
    'DEBIT',
    'Other',
  ].includes(accountType);
}

export function isLiabilityAccount(accountType: AccountType): boolean {
  return ['Credit', 'Loan'].includes(accountType);
}

export function categorizeBankAccount(
  accountType: AccountType,
): 'Asset' | 'Liability' {
  if (isAssetAccount(accountType)) return 'Asset';
  if (isLiabilityAccount(accountType)) return 'Liability';
  return 'Asset';
}
