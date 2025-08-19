import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { getNextDueDateForIncome } from 'src/utils/methods';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { EditExpenseDto } from './dto/update-expense.dto';
import { ExpenseFilterDto } from './dto/expense-filter.dto';
import { filterExpense } from 'src/utils/expense-filter.util';
import { CurrencyConversionService } from 'src/common/services/currencyConversion.service';
import { NetWorthService } from 'src/common/services/net-worth.service';
import { getStartDateByTimePeriod } from 'src/utils/dateFilter.util';
import { BankOperationType, Expense } from '@prisma/client';
import { BankService } from 'src/bank/bank.service';

@Injectable()
export class ExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyConversionService: CurrencyConversionService,
    @Inject(forwardRef(() => NetWorthService))
    private readonly netWorthService: NetWorthService,
    private readonly bankService: BankService,
  ) {}
  async addExpense(userId: number, createExpenseDto: CreateExpenseDto) {
    try {
      const {
        expenseAmount,
        expenseCurrencyCode,
        paidFrom,
        paidFromImage,
        paidTo,
        paidToCategory,
        taxStatus,
        taxPercentage,
        fxMarkupStatus,
        fxMarkupValue,
        recurringType,
        expenseDate,
        bankId,
        ...rest
      } = createExpenseDto;

      const bankAccount = await this.prisma.bank.findFirst({
        where: {
          bankId,
          fkUserId: userId,
        },
      });

      if (!bankAccount) {
        throw new NotFoundException(
          'Bank account not found or does not belong to user',
        );
      }

      const user = await this.prisma.user.findUnique({
        where: { userId },
        select: { defaultCurrencyCode: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (taxStatus !== 'Out_Of_Scope' && taxPercentage === undefined) {
        throw new BadRequestException(
          'Tax percentage is required when tax status is INCLUDED or EXCLUDED',
        );
      }

      if (fxMarkupStatus !== 'Out_Of_Scope' && fxMarkupValue === undefined) {
        throw new BadRequestException(
          'FX markup value is required when FX markup status is INCLUDED or EXCLUDED',
        );
      }

      const [
        {
          convertedAmount: amountInDefaultCurrency,
          exchangeRate: exchangeRateForBaseCurrency,
        },
        {
          convertedAmount: amountInCADCurrency,
          exchangeRate: exchangeRateForCAD,
        },
      ] = await Promise.all([
        this.currencyConversionService.convertCurrency(
          expenseAmount,
          expenseCurrencyCode,
          user.defaultCurrencyCode,
        ),
        this.currencyConversionService.convertCurrency(
          expenseAmount,
          expenseCurrencyCode,
          'CAD',
        ),
      ]);

      const now = new Date();
      const today = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );

      const nextDueDate =
        recurringType === 'NoRecurring'
          ? null
          : getNextDueDateForIncome(recurringType, today);

      const newExpense = await this.prisma.$transaction(async (prisma) => {
        const transactionData = {
          amountInGivenCurrency: expenseAmount,
          amountCurrency: expenseCurrencyCode,
          amountInBaseCurrency: amountInDefaultCurrency,
          BaseCurrency: user.defaultCurrencyCode,
          amountInCADCurrency: amountInCADCurrency,
          CADCurrency: 'CAD',
          exchangeRateForBaseCurrency,
          exchangeRateForCAD,
          fkUserId: userId,
          fkBankId: bankId,
          partyName: paidTo,
          categoryName: paidToCategory,
        };

        const expense = await prisma.expense.create({
          data: {
            fkUserId: userId,
            fkBankId: bankId,
            paidFrom,
            paidFromImage,
            paidTo,
            paidToCategory,
            expenseAmountInGivenCurrency: expenseAmount,
            expenseAmountCurrency: expenseCurrencyCode,
            expenseAmountInBaseCurrency: amountInDefaultCurrency,
            expenseAmountInCADCurrency: amountInCADCurrency,
            baseCurrency: user.defaultCurrencyCode,
            taxStatus,
            taxPercentage: taxStatus !== 'Out_Of_Scope' ? taxPercentage : null,
            fxMarkupStatus,
            fxMarkupValue:
              fxMarkupStatus !== 'Out_Of_Scope' ? fxMarkupValue : null,
            expenseDate,
            recurringType,
            nextDueDate,
            createdDate: expenseDate,
            updatedAt: expenseDate,
            CADCurrency: 'CAD',
          },
        });

        if (recurringType !== 'NoRecurring') {
          await this.createHistoricalExpenseTransactions(
            prisma,
            new Date(expenseDate as Date),
            expense,
            transactionData,
            recurringType,
          );
        }

        if (recurringType === 'NoRecurring' && expenseDate) {
          await prisma.transactions.create({
            data: {
              ...transactionData,
              fkExpenseId: expense.expenseId,
              transactionType: 'EXPENSE',
              createdAt: new Date(expenseDate),
              updatedAt: new Date(expenseDate),
            },
          });
        }

        const transactionCount = await prisma.transactions.count({
          where: { fkExpenseId: expense.expenseId },
        });

        if (bankAccount.isCreditAccount) {
          await prisma.bank.update({
            where: { bankId },
            data: {
              creditAccountLiabilityInDefaultCurrency: {
                increment: amountInDefaultCurrency * transactionCount,
              },
              creditAccountLiabilityInCAD: {
                increment: amountInCADCurrency * transactionCount,
              },
              accountAmount: {
                decrement: expenseAmount * transactionCount,
              },
              accountAmountInDefaultCurrency: {
                decrement: amountInDefaultCurrency * transactionCount,
              },
              accountAmountInCADCurrency: {
                decrement: amountInCADCurrency * transactionCount,
              },
            },
          });
        } else {
          await this.bankService.updateBankAccountBalance(
            bankId,
            expenseAmount * transactionCount,
            expenseCurrencyCode,
            'DEDUCT',
            userId,
            BankOperationType.EXPENSE,
          );
        }

        return expense;
      });

      await this.netWorthService.storeNetWorthHistory(userId);
      return newExpense;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error(error);
      throw new InternalServerErrorException('Could not add expense');
    }
  }
  async editExpense(
    userId: number,
    expenseId: number,
    editExpenseDto: EditExpenseDto,
  ) {
    try {
      if (!editExpenseDto || Object.keys(editExpenseDto).length === 0) {
        throw new BadRequestException('No fields provided for update');
      }
      const existingExpense = await this.prisma.expense.findUnique({
        where: { expenseId },
      });
      if (!existingExpense) {
        throw new NotFoundException('Expense not found');
      }

      if (existingExpense.fkUserId !== userId) {
        throw new ForbiddenException(
          'You are not allowed to edit this expense',
        );
      }
      const {
        expenseAmount = existingExpense.expenseAmountInGivenCurrency,
        expenseCurrencyCode = existingExpense.expenseAmountCurrency,
        taxStatus = existingExpense.taxStatus,
        taxPercentage = existingExpense.taxPercentage,
        fxMarkupStatus = existingExpense.fxMarkupStatus,
        fxMarkupValue = existingExpense.fxMarkupValue,
        recurringType = existingExpense.recurringType,
        paidFrom = existingExpense.paidFrom,
        paidTo = existingExpense.paidTo,
        paidToCategory = existingExpense.paidToCategory,
        expenseDate = existingExpense.expenseDate,
        bankId = existingExpense.fkBankId,
        ...rest
      } = editExpenseDto;
      if (taxStatus !== 'Out_Of_Scope' && taxPercentage === undefined) {
        throw new BadRequestException(
          'Tax percentage is required when tax status is INCLUDED or EXCLUDED',
        );
      }
      if (fxMarkupStatus !== 'Out_Of_Scope' && fxMarkupValue === undefined) {
        throw new BadRequestException(
          'FX markup value is required when FX markup status is INCLUDED or EXCLUDED',
        );
      }

      let amountInDefaultCurrency = existingExpense.expenseAmountInBaseCurrency;
      let amountInCADCurrency = existingExpense.expenseAmountInCADCurrency;
      if (
        expenseAmount !== existingExpense.expenseAmountInGivenCurrency ||
        expenseCurrencyCode !== existingExpense.expenseAmountCurrency
      ) {
        const user = await this.prisma.user.findUnique({
          where: { userId },
          select: { defaultCurrencyCode: true },
        });

        if (!user) {
          throw new NotFoundException('User not found');
        }
        const [
          { convertedAmount: updatedAmountInDefaultCurrency },
          { convertedAmount: updatedAmountInCADCurrency },
        ] = await Promise.all([
          this.currencyConversionService.convertCurrency(
            expenseAmount,
            expenseCurrencyCode,
            user.defaultCurrencyCode,
          ),
          this.currencyConversionService.convertCurrency(
            expenseAmount,
            expenseCurrencyCode,
            'CAD',
          ),
        ]);
        amountInDefaultCurrency = updatedAmountInDefaultCurrency;
        amountInCADCurrency = updatedAmountInCADCurrency;
      }
      const nextDueDate =
        recurringType !== existingExpense.recurringType
          ? getNextDueDateForIncome(recurringType, expenseDate as Date)
          : existingExpense.nextDueDate;
      return await this.prisma.$transaction(async (prisma) => {
        const updatedExpense = await prisma.expense.update({
          where: { expenseId },
          data: {
            taxStatus,
            taxPercentage: taxStatus !== 'Out_Of_Scope' ? taxPercentage : null,
            fxMarkupStatus,
            fxMarkupValue:
              fxMarkupStatus !== 'Out_Of_Scope' ? fxMarkupValue : null,
            recurringType,
            nextDueDate,
            paidFrom,
            paidTo,
            paidToCategory,
            expenseDate,
            fkBankId: bankId,
            updatedAt: new Date(),
            expenseAmountCurrency: expenseCurrencyCode,
            expenseAmountInBaseCurrency: amountInDefaultCurrency,
            expenseAmountInCADCurrency: amountInCADCurrency,
            expenseAmountInGivenCurrency: expenseAmount,
            ...rest,
          },
        });
        return updatedExpense;
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error(error);
      throw new InternalServerErrorException('Could not update expense');
    }
  }
  async deleteExpense(userId: number, expenseId: number) {
    try {
      const existingExpense = await this.prisma.expense.findUnique({
        where: { expenseId, isDeleted: false },
      });
      if (!existingExpense) {
        throw new NotFoundException('Expense not found');
      }
      if (existingExpense.fkUserId !== userId) {
        throw new ForbiddenException(
          'You are not allowed to delete this expense',
        );
      }

      await this.prisma.$transaction(async (prisma) => {
        await prisma.expense.update({
          where: { expenseId },
          data: { isDeleted: true, nextDueDate: null },
        });
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      console.error(error);
      throw new InternalServerErrorException('Could not delete expense');
    }
  }
  async getUserExpense(userId: number, filters: ExpenseFilterDto) {
    try {
      const whereClause = {
        ...filterExpense(userId, filters),
      };
      if (filters.excludeNoRecurring) {
        whereClause.recurringType = {
          not: 'NoRecurring',
        };
      }
      const expenseList = await this.prisma.expense.findMany({
        where: whereClause,
        orderBy: { expenseDate: 'desc' },
      });
      return expenseList;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Could not retrieve expenses');
    }
  }
  async getUserNetExpense(
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
        transactionType: 'EXPENSE',
        isDeleted: false,
      };

      if (startDate) {
        whereClause.OR = [
          { createdAt: { gte: startDate } },
          { updatedAt: { gte: startDate } },
        ];
      }

      const aggregate = await this.prisma.transactions.aggregate({
        where: whereClause,
        _sum: {
          amountInCADCurrency: true,
          amountInBaseCurrency: true,
        },
      });

      return {
        totalExpenseInCAD: +(aggregate._sum.amountInCADCurrency || 0).toFixed(
          3,
        ),
        totalExpenseCurrency: 'CAD',
        totalExpenseInDefaultCurrency: +(
          aggregate._sum.amountInBaseCurrency || 0
        ).toFixed(3),
        defaultCurrency: user.defaultCurrencyCode,
      };
    } catch (error) {
      console.error('Error retrieving user net expense:', error);
      throw new InternalServerErrorException('Failed to retrieve net expense');
    }
  }
  async getAverageExpense(
    userId: number,
    timePeriod?: 'today' | 'weekly' | 'monthly' | 'yearly',
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { userId },
        select: { defaultCurrencyCode: true },
      });

      if (!user) throw new NotFoundException('User not found');
      const transactions = await this.prisma.transactions.findMany({
        where: {
          transactionType: 'EXPENSE',
          isDeleted: false,
          fkUserId: userId,
        },
        select: {
          amountInCADCurrency: true,
          amountInGivenCurrency: true,
          amountCurrency: true,
          createdAt: true,
        },
      });
      if (transactions.length === 0) {
        return {
          averageExpenseInCAD: 0,
          averageExpenseInDefaultCurrency: 0,
          defaultCurrency: user.defaultCurrencyCode,
        };
      }
      const allSameCurrency = transactions.every(
        (transaction) =>
          transaction.amountCurrency === user.defaultCurrencyCode,
      );
      const periodMap: { [key: string]: { cad: number; default?: number } } =
        {};
      for (const t of transactions) {
        let key = '';
        const d = t.createdAt;

        switch (timePeriod) {
          case 'today':
            key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
            break;
          case 'weekly': {
            const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
            const pastDaysOfYear = Math.floor(
              (+d - +firstDayOfYear) / (24 * 60 * 60 * 1000),
            );
            const week = Math.floor(pastDaysOfYear / 7) + 1;
            key = `${d.getFullYear()}-W${week}`;
            break;
          }
          case 'monthly':
            key = `${d.getFullYear()}-${d.getMonth() + 1}`;
            break;
          case 'yearly':
            key = `${d.getFullYear()}`;
            break;
          default:
            throw new BadRequestException(
              'Invalid type. Use daily, weekly, monthly, or yearly',
            );
        }

        if (!periodMap[key]) {
          periodMap[key] = {
            cad: 0,
            default: 0,
          };
        }

        periodMap[key].cad += t.amountInCADCurrency || 0;

        if (allSameCurrency) {
          periodMap[key].default! += t.amountInGivenCurrency || 0;
        }
      }

      const totalExpenseCAD = Object.values(periodMap).reduce(
        (sum, val) => sum + val.cad,
        0,
      );

      const distinctPeriods = Object.keys(periodMap).length;
      if (distinctPeriods <= 1) {
        return {
          averageExpenseInCAD: 0,
          averageExpenseInDefaultCurrency: 0,
          defaultCurrency: user.defaultCurrencyCode,
          note: 'Not enough data points',
        };
      }
      const averageCAD = distinctPeriods
        ? totalExpenseCAD / distinctPeriods
        : 0;

      let averageInDefaultCurrency: number;

      if (allSameCurrency) {
        const totalExpenseDefault = Object.values(periodMap).reduce(
          (sum, val) => sum + (val.default || 0),
          0,
        );
        averageInDefaultCurrency = distinctPeriods
          ? totalExpenseDefault / distinctPeriods
          : 0;
      } else {
        const { convertedAmount } =
          await this.currencyConversionService.convertCurrency(
            averageCAD,
            'CAD',
            user.defaultCurrencyCode,
          );
        averageInDefaultCurrency = convertedAmount;
      }

      return {
        averageExpenseInCAD: +averageCAD.toFixed(3),
        averageExpenseInDefaultCurrency: +averageInDefaultCurrency.toFixed(3),
        defaultCurrency: user.defaultCurrencyCode,
      };
    } catch (err) {
      console.error('Error calculating average expense:', err);
      throw new InternalServerErrorException(
        'Failed to calculate average expense',
      );
    }
  }
  async getTopMerchants(
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
      if (!user) throw new NotFoundException('User not found');

      const startDate = getStartDateByTimePeriod(timePeriod, customStartDate);

      const transactions = await this.prisma.transactions.findMany({
        where: {
          fkUserId: userId,
          transactionType: 'EXPENSE',
          isDeleted: false,
          ...(startDate && {
            OR: [
              { createdAt: { gte: startDate } },
              { updatedAt: { gte: startDate } },
            ],
          }),
        },
        select: {
          partyName: true,
          amountInBaseCurrency: true,
          amountInCADCurrency: true,
        },
      });

      const merchantMap = new Map<
        string,
        {
          totalCount: number;
          totalAmountInDefaultCurrency: number;
          totalAmountInCAD: number;
        }
      >();
      for (const tx of transactions) {
        const merchant = tx.partyName!;
        const amountDefault = tx.amountInBaseCurrency || 0;
        const amountCAD = tx.amountInCADCurrency || 0;

        if (merchantMap.has(merchant)) {
          const existing = merchantMap.get(merchant)!;
          merchantMap.set(merchant, {
            totalCount: existing.totalCount + 1,
            totalAmountInDefaultCurrency:
              existing.totalAmountInDefaultCurrency + amountDefault,
            totalAmountInCAD: existing.totalAmountInCAD + amountCAD,
          });
        } else {
          merchantMap.set(merchant, {
            totalCount: 1,
            totalAmountInDefaultCurrency: amountDefault,
            totalAmountInCAD: amountCAD,
          });
        }
      }
      const topMerchants = Array.from(merchantMap.entries())
        .map(([merchant, data]) => ({
          merchant,
          totalCount: data.totalCount,
          totalAmountInDefaultCurrency: Number(
            data.totalAmountInDefaultCurrency.toFixed(3),
          ),
          totalAmountInCAD: Number(data.totalAmountInCAD.toFixed(3)),
          defaultCurrency: user.defaultCurrencyCode,
        }))
        .sort(
          (a, b) =>
            b.totalAmountInDefaultCurrency - a.totalAmountInDefaultCurrency,
        )
        .slice(0, 10);

      return { topMerchants };
    } catch (error) {
      console.error('Error retrieving top merchants:', error);
      throw new InternalServerErrorException(
        'Failed to retrieve top merchants',
      );
    }
  }

  async getTopCategories(
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
      if (!user) throw new NotFoundException('User not found');

      const startDate = getStartDateByTimePeriod(timePeriod, customStartDate);

      const transactions = await this.prisma.transactions.findMany({
        where: {
          fkUserId: userId,
          transactionType: 'EXPENSE',
          isDeleted: false,
          ...(startDate && {
            OR: [
              { createdAt: { gte: startDate } },
              { updatedAt: { gte: startDate } },
            ],
          }),
        },
        select: {
          categoryName: true,
          amountInBaseCurrency: true,
          amountInCADCurrency: true,
        },
      });

      const categoryMap = new Map<
        string,
        {
          totalCount: number;
          totalAmountInDefaultCurrency: number;
          totalAmountInCAD: number;
        }
      >();
      for (const tx of transactions) {
        const category = tx.categoryName!;
        const amountDefault = tx.amountInBaseCurrency || 0;
        const amountCAD = tx.amountInCADCurrency || 0;

        if (categoryMap.has(category)) {
          const existing = categoryMap.get(category)!;
          categoryMap.set(category, {
            totalCount: existing.totalCount + 1,
            totalAmountInDefaultCurrency:
              existing.totalAmountInDefaultCurrency + amountDefault,
            totalAmountInCAD: existing.totalAmountInCAD + amountCAD,
          });
        } else {
          categoryMap.set(category, {
            totalCount: 1,
            totalAmountInDefaultCurrency: amountDefault,
            totalAmountInCAD: amountCAD,
          });
        }
      }
      const topCategories = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          totalCount: data.totalCount,
          totalAmountInDefaultCurrency: Number(
            data.totalAmountInDefaultCurrency.toFixed(3),
          ),
          totalAmountInCAD: Number(data.totalAmountInCAD.toFixed(3)),
          defaultCurrency: user.defaultCurrencyCode,
        }))
        .sort(
          (a, b) =>
            b.totalAmountInDefaultCurrency - a.totalAmountInDefaultCurrency,
        )
        .slice(0, 10);

      return { topCategories };
    } catch (error) {
      console.error('Error retrieving top categories:', error);
      throw new InternalServerErrorException(
        'Failed to retrieve top categories',
      );
    }
  }

  private async createHistoricalExpenseTransactions(
    prisma,
    startDate: Date,
    expense: Expense,
    transactionData: any,
    recurringType: string,
  ) {
    const dates: Date[] = [];
    let currentDate = new Date(
      Date.UTC(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
      ),
    );
    const today = new Date();
    const todayUTC = new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
    );

    while (true) {
      if (currentDate > todayUTC) break;
      if (
        currentDate < todayUTC ||
        currentDate.getTime() === todayUTC.getTime()
      ) {
        dates.push(new Date(currentDate));
      }
      const nextDate = getNextDueDateForIncome(recurringType, currentDate);
      if (!nextDate) break;
      const next = new Date(
        Date.UTC(
          nextDate.getFullYear(),
          nextDate.getMonth(),
          nextDate.getDate(),
        ),
      );
      if (next <= currentDate) break;
      currentDate = next;
    }

    for (const date of dates) {
      await prisma.transactions.create({
        data: {
          ...transactionData,
          transactionType: 'EXPENSE',
          createdAt: date,
          updatedAt: date,
          fkExpenseId: expense.expenseId,
        },
      });
    }
  }
}
