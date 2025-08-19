import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import {
  calculateBudgetEndDate,
  getNextDueDateForBudget,
  getStartOfPeriod,
} from 'src/utils/methods';
import { EditBudgetDto } from './dto/update-budget.dto';
import { BudgetFilterDto } from './dto/budget-filter.dto';
import { filterBudget } from 'src/utils/budget-filter.util';
import { CurrencyConversionService } from 'src/common/services/currencyConversion.service';
import { getStartDateByTimePeriod } from 'src/utils/dateFilter.util';
import { BudgetContributionCycle } from '@prisma/client';

@Injectable()
export class BudgetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyConversionService: CurrencyConversionService,
  ) {}

  async addBudget(userId: number, createBudgetDto: CreateBudgetDto) {
    try {
      const {
        budgetAmount,
        budgetCurrencyCode,
        categoryName,
        budgetContributionCycle,
      } = createBudgetDto;

      const user = await this.prisma.user.findUnique({
        where: { userId },
        select: { defaultCurrencyCode: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const existingBudget = await this.prisma.budget.findFirst({
        where: {
          fkUserId: userId,
          categoryName,
          isDeleted: false,
        },
      });

      if (existingBudget) {
        throw new BadRequestException(
          'Budget already exists for this category',
        );
      }

      const [
        { convertedAmount: budgetAmountInBaseCurrency },
        { convertedAmount: budgetAmountInCADCurrency },
      ] = await Promise.all([
        this.currencyConversionService.convertCurrency(
          budgetAmount,
          budgetCurrencyCode,
          user.defaultCurrencyCode,
        ),
        this.currencyConversionService.convertCurrency(
          budgetAmount,
          budgetCurrencyCode,
          'CAD',
        ),
      ]);
      const now = new Date();
      const startDate = getStartOfPeriod(now, budgetContributionCycle);
      const endDate = calculateBudgetEndDate(
        startDate,
        budgetContributionCycle,
      );
      const nextDueDate = getNextDueDateForBudget(
        budgetContributionCycle,
        startDate,
      );
      const createdBudget = await this.prisma.$transaction(async (prisma) => {
        const budget = await prisma.budget.create({
          data: {
            fkUserId: userId,
            categoryName,
            budgetContributionCycle,
            budgetAmountInGivenCurrency: budgetAmount,
            budgetAmountCurrency: budgetCurrencyCode,
            budgetAmountInBaseCurrency,
            budgetAmountInCADCurrency,
            baseCurrency: user.defaultCurrencyCode,
            CADCurrency: 'CAD',
            nextDueDate,
          },
        });
        await prisma.budgetLog.create({
          data: {
            fkBudgetId: budget.budgetId,
            fkUserId: userId,
            categoryName,
            budgetContributionCycle,
            budgetAmountInGivenCurrency: budgetAmount,
            budgetAmountCurrency: budgetCurrencyCode,
            budgetAmountInBaseCurrency,
            baseCurrency: user.defaultCurrencyCode,
            budgetAmountInCADCurrency,
            CADCurrency: 'CAD',
            startDate,
            endDate,
            isActive: true,
          },
        });
        return budget;
      });
      return createdBudget;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error(error);
      throw new InternalServerErrorException('Could not add budget');
    }
  }
  async editBudget(
    userId: number,
    budgetId: number,
    editBudgetDto: EditBudgetDto,
  ) {
    try {
      if (!editBudgetDto || Object.keys(editBudgetDto).length === 0) {
        throw new BadRequestException('No fields provided for update');
      }

      const existingBudget = await this.prisma.budget.findUnique({
        where: { budgetId },
        include: {
          budgetLogs: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!existingBudget) {
        throw new NotFoundException('Budget not found');
      }

      if (existingBudget.fkUserId !== userId) {
        throw new ForbiddenException('You are not allowed to edit this budget');
      }

      const activeLog = existingBudget.budgetLogs[0];
      if (!activeLog) {
        throw new NotFoundException('Active budget log not found');
      }

      const {
        budgetAmount = activeLog.budgetAmountInGivenCurrency,
        budgetCurrencyCode = activeLog.budgetAmountCurrency,
        categoryName = existingBudget.categoryName,
        budgetContributionCycle = existingBudget.budgetContributionCycle,
      } = editBudgetDto;

      const isCategoryChanged = categoryName !== existingBudget.categoryName;
      const isCycleChanged =
        budgetContributionCycle !== existingBudget.budgetContributionCycle;
      const isAmountOrCurrencyChanged =
        budgetAmount !== activeLog.budgetAmountInGivenCurrency ||
        budgetCurrencyCode !== activeLog.budgetAmountCurrency;

      if (isCategoryChanged) {
        const duplicateBudget = await this.prisma.budget.findFirst({
          where: {
            fkUserId: userId,
            categoryName,
            isDeleted: false,
            NOT: { budgetId },
          },
        });
        if (duplicateBudget) {
          throw new BadRequestException(
            'Budget already exists for this category',
          );
        }
      }
      const user = await this.prisma.user.findUnique({
        where: { userId },
        select: { defaultCurrencyCode: true },
      });
      if (!user) throw new NotFoundException('User not found');
      const [convertedToDefault, convertedToCAD] = await Promise.all([
        this.currencyConversionService.convertCurrency(
          budgetAmount,
          budgetCurrencyCode,
          user.defaultCurrencyCode,
        ),
        this.currencyConversionService.convertCurrency(
          budgetAmount,
          budgetCurrencyCode,
          'CAD',
        ),
      ]);
      return await this.prisma.$transaction(async (prisma) => {
        if (isCategoryChanged || isCycleChanged) {
          const nextDueDate = getNextDueDateForBudget(
            budgetContributionCycle,
            new Date(),
          );
          const endDate = calculateBudgetEndDate(
            new Date(),
            budgetContributionCycle,
          );
          await prisma.budget.update({
            where: { budgetId },
            data: {
              categoryName,
              budgetContributionCycle,
              budgetAmountInGivenCurrency: budgetAmount,
              budgetAmountCurrency: budgetCurrencyCode,
              budgetAmountInBaseCurrency: convertedToDefault.convertedAmount,
              budgetAmountInCADCurrency: convertedToCAD.convertedAmount,
              nextDueDate,
              updatedAt: new Date(),
            },
          });
          await prisma.budgetLog.update({
            where: { logId: activeLog.logId },
            data: { isActive: false, updatedAt: new Date() },
          });
          const newLog = await prisma.budgetLog.create({
            data: {
              fkBudgetId: budgetId,
              budgetAmountInGivenCurrency: budgetAmount,
              budgetAmountCurrency: budgetCurrencyCode,
              budgetAmountInBaseCurrency: convertedToDefault.convertedAmount,
              baseCurrency: user.defaultCurrencyCode,
              budgetAmountInCADCurrency: convertedToCAD.convertedAmount,
              CADCurrency: 'CAD',
              isActive: true,
              budgetContributionCycle,
              categoryName,
              fkUserId: userId,
              startDate: new Date(),
              endDate,
            },
          });
          return newLog;
        } else if (isAmountOrCurrencyChanged) {
          await prisma.budget.update({
            where: { budgetId },
            data: {
              budgetAmountInGivenCurrency: budgetAmount,
              budgetAmountCurrency: budgetCurrencyCode,
              budgetAmountInBaseCurrency: convertedToDefault.convertedAmount,
              budgetAmountInCADCurrency: convertedToCAD.convertedAmount,
              updatedAt: new Date(),
            },
          });
          return await prisma.budgetLog.update({
            where: { logId: activeLog.logId },
            data: {
              budgetAmountInGivenCurrency: budgetAmount,
              budgetAmountCurrency: budgetCurrencyCode,
              budgetAmountInBaseCurrency: convertedToDefault.convertedAmount,
              budgetAmountInCADCurrency: convertedToCAD.convertedAmount,
              updatedAt: new Date(),
            },
          });
        }
        return existingBudget;
      });
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      console.error(error);
      throw new InternalServerErrorException('Could not update budget');
    }
  }

  async deleteBudget(userId: number, budgetId: number): Promise<void> {
    try {
      const existingBudget = await this.prisma.budget.findUnique({
        where: { budgetId },
        include: {
          budgetLogs: {
            where: { isActive: true },
          },
        },
      });
      if (!existingBudget || existingBudget.isDeleted) {
        throw new NotFoundException('Budget record not found');
      }
      if (existingBudget.fkUserId !== userId) {
        throw new ForbiddenException(
          'You are not allowed to delete this budget',
        );
      }
      await this.prisma.$transaction(async (prisma) => {
        await prisma.budget.update({
          where: { budgetId },
          data: {
            isDeleted: true,
            nextDueDate: null,
          },
        });
        await prisma.budgetLog.updateMany({
          where: {
            fkBudgetId: budgetId,
            isActive: true,
          },
          data: {
            isActive: false,
          },
        });
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Could not delete budget');
    }
  }
  async getUserNetBudget(
    userId: number,
    timePeriod?:
      | 'today'
      | 'weekly'
      | 'monthly'
      | 'yearly'
      | '2years'
      | '3years'
      | '4years'
      | 'custom',
    customStartDate?: Date,
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { userId },
        select: { defaultCurrencyCode: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }
      const startDate = getStartDateByTimePeriod(timePeriod, customStartDate);
      const whereClause: any = {
        fkUserId: userId,
        isActive: true,
      };
      if (startDate) {
        whereClause.createdAt = { gte: startDate };
      }
      const aggregate = await this.prisma.budgetLog.aggregate({
        where: whereClause,
        _sum: {
          budgetAmountInCADCurrency: true,
          budgetAmountInBaseCurrency: true,
          budgetAmountInGivenCurrency: true,
        },
      });
      const totalBudgetInCAD = +(
        aggregate._sum.budgetAmountInCADCurrency || 0
      ).toFixed(3);
      const totalBudgetInDefaultCurrency = +(
        aggregate._sum.budgetAmountInBaseCurrency || 0
      ).toFixed(3);

      return {
        totalBudgetInCAD,
        totalBudgetCurrency: 'CAD',
        totalBudgetInDefaultCurrency,
        defaultCurrency: user.defaultCurrencyCode,
      };
    } catch (error) {
      console.error('Error retrieving user net budget:', error);
      throw new InternalServerErrorException('Failed to retrieve net budget');
    }
  }
  async getUserBudget(userId: number, filters: BudgetFilterDto) {
    try {
      const whereClause = filterBudget(userId, filters);
      const budgetLogs = await this.prisma.budgetLog.findMany({
        where: {
          isActive: true,
          budget: whereClause,
        },
        include: { budget: true },
        orderBy: { updatedAt: 'desc' },
      });
      const result: any[] = [];
      for (const log of budgetLogs) {
        const {
          startDate,
          endDate,
          categoryName,
          budgetAmountInGivenCurrency,
          budgetAmountInCADCurrency,
          baseCurrency,
        } = log;
        const transactions = await this.prisma.transactions.findMany({
          where: {
            fkUserId: userId,
            transactionType: 'EXPENSE',
            categoryName,
            isDeleted: false,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            amountCurrency: true,
            amountInGivenCurrency: true,
            amountInBaseCurrency: true,
            amountInCADCurrency: true,
            BaseCurrency: true,
          },
        });
        let totalSpentDefault = 0;
        let totalSpentCAD = 0;
        for (const tx of transactions) {
          if (tx.amountCurrency === tx.BaseCurrency) {
            totalSpentDefault += tx.amountInGivenCurrency || 0;
          } else {
            totalSpentDefault += tx.amountInBaseCurrency || 0;
          }
          if (tx.amountCurrency === 'CAD') {
            totalSpentCAD += tx.amountInGivenCurrency || 0;
          } else {
            totalSpentCAD += tx.amountInCADCurrency || 0;
          }
        }
        const historicalAverage = await this.calculateHistoricalAverage(
          userId,
          categoryName,
          log.budget.budgetContributionCycle,
        );
        const remainingGiven = budgetAmountInGivenCurrency - totalSpentDefault;
        const remainingCAD = budgetAmountInCADCurrency - totalSpentCAD;
        result.push({
          ...log.budget,
          calculation: {
            defaultCurrency: {
              currency: baseCurrency,
              totalBudget: budgetAmountInGivenCurrency,
              totalSpent: totalSpentDefault,
              remainingAmount: remainingGiven,
              historicalAveragePerCycle:
                historicalAverage.defaultCurrencyAverage,
            },
            cadCurrency: {
              currency: 'CAD',
              totalBudget: budgetAmountInCADCurrency,
              totalSpent: totalSpentCAD,
              remainingAmount: remainingCAD,
              historicalAveragePerCycle: historicalAverage.cadCurrencyAverage,
            },
          },
        });
      }
      return result;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Could not retrieve budgets');
    }
  }
  private async calculateHistoricalAverage(
    userId: number,
    categoryName: string,
    contributionCycle: BudgetContributionCycle,
  ): Promise<{
    defaultCurrencyAverage: number;
    cadCurrencyAverage: number;
    note?: string;
  }> {
    const transactions = await this.prisma.transactions.findMany({
      where: {
        fkUserId: userId,
        transactionType: 'EXPENSE',
        categoryName,
        isDeleted: false,
      },
      select: {
        amountInBaseCurrency: true,
        amountInCADCurrency: true,
        amountCurrency: true,
        BaseCurrency: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'asc',
      },
    });
    if (!transactions.length) {
      return {
        defaultCurrencyAverage: 0,
        cadCurrencyAverage: 0,
      };
    }
    let totalDefault = 0;
    let totalCAD = 0;

    for (const tx of transactions) {
      if (tx.amountCurrency === tx.BaseCurrency) {
        totalDefault += tx.amountInBaseCurrency || 0;
      } else {
        totalDefault += tx.amountInBaseCurrency || 0;
      }
      totalCAD += tx.amountInCADCurrency || 0;
    }
    const firstDate = transactions[0].updatedAt;
    const lastDate = transactions[transactions.length - 1].updatedAt;

    let numberOfCycles = 0;

    switch (contributionCycle) {
      case BudgetContributionCycle.Daily: {
        const uniqueDays = new Set(
          transactions.map((tx) => tx.updatedAt.toISOString().split('T')[0]),
        );
        numberOfCycles = uniqueDays.size;
        break;
      }

      case BudgetContributionCycle.Weekly: {
        const getWeekKey = (date: Date) => {
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          const jan1 = new Date(d.getFullYear(), 0, 1);
          const days = Math.floor(
            (d.getTime() - jan1.getTime()) / (1000 * 60 * 60 * 24),
          );
          const weekNumber = Math.floor(days / 7);
          return `${d.getFullYear()}-W${weekNumber}`;
        };

        const uniqueWeeks = new Set(
          transactions.map((tx) => getWeekKey(tx.updatedAt)),
        );
        numberOfCycles = uniqueWeeks.size;
        break;
      }
      case BudgetContributionCycle.Monthly: {
        const start = new Date(firstDate);
        const end = new Date(lastDate);
        const months =
          end.getFullYear() * 12 +
          end.getMonth() -
          (start.getFullYear() * 12 + start.getMonth()) +
          1;
        numberOfCycles = months;
        break;
      }
      case BudgetContributionCycle.Yearly:
        numberOfCycles = lastDate.getFullYear() - firstDate.getFullYear() + 1;
        break;

      default:
        numberOfCycles = 0;
    }
    if (numberOfCycles <= 1) {
      return {
        defaultCurrencyAverage: 0,
        cadCurrencyAverage: 0,
      };
    }
    return {
      defaultCurrencyAverage: totalDefault / numberOfCycles,
      cadCurrencyAverage: totalCAD / numberOfCycles,
    };
  }
}
