import { BadRequestException } from '@nestjs/common';
export function getStartDateByTimePeriod(
  timePeriod:
    | 'today'
    | 'yesterday'
    | 'weekly'
    | 'last15days'
    | 'monthly'
    | 'yearly'
    | '2years'
    | '3years'
    | '4years'
    | 'custom'
    | undefined,
  customStartDate?: Date,
): Date | undefined {
  if (!timePeriod) {
    return undefined;
  }

  const now = new Date();

  switch (timePeriod) {
    case 'today':
      return new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
      );
    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setUTCDate(now.getUTCDate() - 1);
      yesterday.setUTCHours(0, 0, 0, 0);
      return yesterday;
    }
    case 'weekly': {
      const startOfWeek = new Date(now);
      startOfWeek.setUTCDate(now.getUTCDate() - now.getUTCDay());
      startOfWeek.setUTCHours(0, 0, 0, 0);
      return startOfWeek;
    }
    case 'last15days': {
      const fifteenDaysAgo = new Date(now);
      fifteenDaysAgo.setUTCDate(now.getUTCDate() - 15);
      fifteenDaysAgo.setUTCHours(0, 0, 0, 0);
      return fifteenDaysAgo;
    }
    case 'monthly':
      return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    case 'yearly':
      return new Date(Date.UTC(now.getFullYear(), 0, 1));
    case '2years':
      return new Date(Date.UTC(now.getFullYear() - 2, 0, 1));
    case '3years':
      return new Date(Date.UTC(now.getFullYear() - 3, 0, 1));
    case '4years':
      return new Date(Date.UTC(now.getFullYear() - 4, 0, 1));
    case 'custom':
      if (!customStartDate) {
        throw new BadRequestException(
          'Custom start date is required for custom time period',
        );
      }
      return customStartDate;
    default:
      throw new BadRequestException('Invalid time period');
  }
}
