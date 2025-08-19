export class ExpenseFilterDto {
  paidFrom?: string;
  paidTo?: string;
  recurringType?: string;
  excludeNoRecurring?: boolean;
}