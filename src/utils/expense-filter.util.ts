import { ExpenseFilterDto } from 'src/expense/dto/expense-filter.dto';

export function filterExpense(
  fkUserId: number,
  filters: ExpenseFilterDto,
): any {
  const { paidFrom, paidTo, recurringType } = filters;
  const whereClause: any = {
    fkUserId,
    isDeleted: false,
  };
  if (paidFrom) {
    whereClause.paidFrom = paidFrom;
  }
  if (paidTo) {
    whereClause.paidTo = paidTo;
  }
  if (recurringType) {
    whereClause.recurringType = recurringType;
  }
  return whereClause;
}
