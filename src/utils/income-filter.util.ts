import { IncomeFilterDto } from 'src/income/dto/income-filter.dto';
export function filterIncome(
  fkUserId: number,
  filters: IncomeFilterDto,
): any {
  const {
    incomeDate,
    categoryName,
    receivedFrom,
    receivedIn,
    recurringType,
  } = filters;
  const whereClause: any = {
    fkUserId,
    isDeleted: false,
  };
  if (categoryName) {
    whereClause.categoryName = categoryName;
  }
  if (receivedFrom) {
    whereClause.receivedFrom = receivedFrom;
  }
  if (receivedIn) {
    whereClause.receivedIn = receivedIn;
  }
  if (recurringType) {
    whereClause.recurringType = recurringType;
  }
  if (incomeDate) {
    const now = new Date();
    switch (incomeDate) {
      case 'weekly':
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        whereClause.incomeDate = { gte: oneWeekAgo };
        break;
      case 'monthly':
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);
        whereClause.incomeDate = { gte: oneMonthAgo };
        break;
      case 'yearly':
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(now.getFullYear() - 1);
        whereClause.incomeDate = { gte: oneYearAgo };
        break;
    }
  }
  return whereClause;
}
