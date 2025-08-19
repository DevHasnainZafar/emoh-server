import {
  AccountType,
  BudgetContributionCycle,
  CustomRecurringDays,
  CustomRecurringInterval,
} from '@prisma/client';
import { randomInt } from 'crypto';
export function generateOtp(length: number = 4): number {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return randomInt(min, max);
}

export const getNextDueDateForIncome = (
  recurringType: string,
  currentDate: Date,
  customRecurringUnit?: number,
  customRecurringInterval?: CustomRecurringInterval,
  customRecurringDays?: CustomRecurringDays[],
  customRecurringStartDate?: Date,
  customRecurringEndDate?: Date,
): Date | null => {
  if (recurringType === 'NoRecurring') {
    return null;
  }
  let nextDate: Date = new Date(currentDate);
  if (recurringType !== 'Custom') {
    switch (recurringType) {
      case 'Weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        // nextDate
        break;
      case 'Monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'Yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      case 'Biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      default:
        return null;
    }
  } else {
    if (
      !customRecurringUnit ||
      !customRecurringInterval ||
      !customRecurringStartDate ||
      !customRecurringEndDate
    ) {
      return null;
    }
    nextDate = new Date(customRecurringStartDate);
    let daysToAdd = customRecurringUnit;
    switch (customRecurringInterval) {
      case CustomRecurringInterval.Day:
      case CustomRecurringInterval.Days:
        nextDate.setDate(nextDate.getDate() + daysToAdd);
        break;
      case CustomRecurringInterval.Week:
        nextDate.setDate(nextDate.getDate() + 7 * daysToAdd);
        break;
      case CustomRecurringInterval.Biweek:
        nextDate.setDate(nextDate.getDate() + 14 * daysToAdd);
        break;
      case CustomRecurringInterval.Month:
        nextDate.setMonth(nextDate.getMonth() + daysToAdd);
        break;
      case CustomRecurringInterval.Quarter:
        nextDate.setMonth(nextDate.getMonth() + 3 * daysToAdd);
        break;
      case CustomRecurringInterval.Year:
        nextDate.setFullYear(nextDate.getFullYear() + daysToAdd);
        break;
    }
    if (customRecurringDays && customRecurringDays.length > 0) {
      const dayNumbers = customRecurringDays.map((day) => {
        switch (day) {
          case 'Sunday':
            return 0;
          case 'Monday':
            return 1;
          case 'Tuesday':
            return 2;
          case 'Wednesday':
            return 3;
          case 'Thursday':
            return 4;
          case 'Friday':
            return 5;
          case 'Saturday':
            return 6;
          default:
            throw new Error(`Invalid day: ${day}`);
        }
      });
      let foundNextDate: Date | null = null;
      for (let i = 0; i <= 7; i++) {
        const testDate = new Date(nextDate);
        testDate.setDate(testDate.getDate() + i);
        if (testDate < new Date(customRecurringStartDate)) continue;
        if (testDate > new Date(customRecurringEndDate)) break;
        if (
          dayNumbers.includes(testDate.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6)
        ) {
          foundNextDate = testDate;
          break;
        }
      }
      if (!foundNextDate) {
        return null;
      }
      nextDate = foundNextDate;
    }
    if (nextDate > new Date(customRecurringEndDate)) {
      return null;
    }
  }
  return nextDate;
};

export const getNextDueDateForBudget = (
  budgetContributionCycle: BudgetContributionCycle,
  currentDate: Date,
): Date | null => {
  if (!budgetContributionCycle) {
    return null;
  }
  let nextDate: Date = new Date(currentDate);
  if (budgetContributionCycle) {
    switch (budgetContributionCycle) {
      case BudgetContributionCycle.Daily:
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case BudgetContributionCycle.Weekly:
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case BudgetContributionCycle.Monthly:
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case BudgetContributionCycle.Yearly:
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        return null;
    }
  } else {
    return null;
  }
  return nextDate;
};
export const calculateBudgetEndDate = (
  startDate: Date,
  cycle: BudgetContributionCycle,
): Date => {
  const endDate = new Date(startDate);

  switch (cycle) {
    case 'Daily':
      endDate.setDate(endDate.getDate() + 1);
      break;
    case 'Weekly':
      endDate.setDate(endDate.getDate() + 7);
      break;
    case 'Monthly':
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case 'Yearly':
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
    default:
      endDate.setDate(endDate.getDate() + 7);
  }
  return endDate;
};
export function getStartOfPeriod(
  date: Date,
  cycle: BudgetContributionCycle,
): Date {
  const newDate = new Date(date);
  switch (cycle) {
    case BudgetContributionCycle.Daily:
      return new Date(
        Date.UTC(
          newDate.getUTCFullYear(),
          newDate.getUTCMonth(),
          newDate.getUTCDate(),
          0,
          0,
          0,
          0,
        ),
      );

    case BudgetContributionCycle.Weekly:
      const day = newDate.getUTCDay();
      const diff = newDate.getUTCDate() - day;
      return new Date(
        Date.UTC(
          newDate.getUTCFullYear(),
          newDate.getUTCMonth(),
          diff,
          0,
          0,
          0,
          0,
        ),
      );

    case BudgetContributionCycle.Monthly:
      return new Date(
        Date.UTC(
          newDate.getUTCFullYear(),
          newDate.getUTCMonth(),
          1,
          0,
          0,
          0,
          0,
        ),
      );

    case BudgetContributionCycle.Yearly:
      return new Date(Date.UTC(newDate.getUTCFullYear(), 0, 1, 0, 0, 0, 0));

    default:
      return new Date(newDate);
  }
}

export const mapPlaidAccountType = (plaidType: string): AccountType => {
  const plaidToAccountTypeMap = {
    depository: 'Chequing',
    savings: 'Saving',
    credit: 'Credit',
    loan: 'Loan',
    investment: 'Investment',
    other: 'Other',
  };
  return plaidToAccountTypeMap[plaidType] || 'Other';
};

export function getInitialSyncDateRange(): {
  startDate: string;
  endDate: string;
} {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];
  const range = process.env.PLAID_INITIAL_SYNC_PERIOD || '2y';
  const value = parseInt(range.slice(0, -1));
  const unit = range.slice(-1);
  const startDateObj = new Date(today);
  switch (unit) {
    case 'w':
      startDateObj.setDate(today.getDate() - value * 7);
      break;
    case 'm':
      startDateObj.setMonth(today.getMonth() - value);
      break;
    case 'y':
      startDateObj.setFullYear(today.getFullYear() - value);
      break;
    default:
      throw new Error(`Invalid INITIAL_SYNC_RANGE: ${range}`);
  }
  const startDate = startDateObj.toISOString().split('T')[0];
  return { startDate, endDate };
}
