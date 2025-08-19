import { BudgetFilterDto } from "src/budget/dto/budget-filter.dto";

export function filterBudget(userId: number, filters: BudgetFilterDto) {
    const whereClause: any = {
      fkUserId: userId,
      isDeleted: false,
    };
    if (filters.categoryName) {
      whereClause.categoryName = filters.categoryName;
    }
    if (filters.budgetContributionCycle) {
      whereClause.budgetContributionCycle = filters.budgetContributionCycle;
    }
    return whereClause;
  }