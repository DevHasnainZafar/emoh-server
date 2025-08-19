import { Transform } from 'class-transformer';

export class BudgetFilterDto {
  @Transform(({ value }) => parseInt(value, 10), { toClassOnly: true })
  categoryName?: string;

  budgetContributionCycle?: string;
}
