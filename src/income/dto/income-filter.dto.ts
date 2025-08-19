import { Transform } from 'class-transformer';

export class IncomeFilterDto {
  incomeDate?: 'weekly' | 'monthly' | 'yearly';

  @Transform(({ value }) => parseInt(value, 10), { toClassOnly: true })
  categoryName?: string;
  receivedFrom?: string;
  receivedIn?: string;
  recurringType?: string;
  excludeNoRecurring?: boolean;
}
