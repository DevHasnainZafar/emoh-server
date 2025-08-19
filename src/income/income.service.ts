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
import { AddIncomeDto } from './dto/add-income.dto';
import { EditIncomeDto } from './dto/edit-income.dto';
import { IncomeFilterDto } from './dto/income-filter.dto';
import { filterIncome } from 'src/utils/income-filter.util';
import { getNextDueDateForIncome } from 'src/utils/methods';
import { CurrencyConversionService } from 'src/common/services/currencyConversion.service';
import { NetWorthService } from 'src/common/services/net-worth.service';
import { getStartDateByTimePeriod } from 'src/utils/dateFilter.util';
import {
  BankOperationType,
  CustomRecurringDays,
  CustomRecurringInterval,
  Income,
  PrismaClient,
} from '@prisma/client';
import { BankService } from 'src/bank/bank.service';

@Injectable()
export class IncomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyConversionService: CurrencyConversionService,
    @Inject(forwardRef(() => NetWorthService))
    private readonly netWorthService: NetWorthService,
    private readonly bankService: BankService,
  ) {}
  async addIncome(userId: number, addIncomeDto: AddIncomeDto) {
    try {
      const {
        incomeAmount,
        incomeAmountCurrencyCode,
        categoryName,
        recurringType,
        customRecurringUnit,
        customRecurringInterval,
        customRecurringStartDate,
        customRecurringEndDate,
        customRecurringDays,
        incomeDate,
        bankId,
        receivedFrom,
        ...rest
      } = addIncomeDto;

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
      if (bankAccount.isCreditAccount) {
        throw new BadRequestException(
          'Income cannot be added to a credit account',
        );
      }

      const user = await this.prisma.user.findUnique({
        where: { userId },
        select: { defaultCurrencyCode: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const {
        convertedAmount: incomeAmountInDefaultCurrency,
        exchangeRate: exchangeRateForBaseCurrency,
      } = await this.currencyConversionService.convertCurrency(
        incomeAmount,
        incomeAmountCurrencyCode,
        user.defaultCurrencyCode,
      );

      const {
        convertedAmount: incomeAmountInCADCurrency,
        exchangeRate: exchangeRateForCAD,
      } = await this.currencyConversionService.convertCurrency(
        incomeAmount,
        incomeAmountCurrencyCode,
        'CAD',
      );

      const now = new Date();
      const today = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
      const nextDueDate =
        recurringType === 'NoRecurring'
          ? null
          : getNextDueDateForIncome(
              recurringType,
              today,
              customRecurringUnit,
              customRecurringInterval,
              customRecurringDays,
              customRecurringStartDate,
              customRecurringEndDate,
            );

      const newIncome = await this.prisma.$transaction(async (prisma) => {
        const transactionData = {
          amountInGivenCurrency: incomeAmount,
          amountCurrency: incomeAmountCurrencyCode,
          amountInBaseCurrency: incomeAmountInDefaultCurrency,
          BaseCurrency: user.defaultCurrencyCode,
          amountInCADCurrency: incomeAmountInCADCurrency,
          exchangeRateForBaseCurrency,
          exchangeRateForCAD,
          fkBankId: bankId,
          fkUserId: userId,
          partyName: receivedFrom,
          categoryName: categoryName,
        };

        const income = await prisma.income.create({
          data: {
            ...rest,
            fkUserId: userId,
            categoryName,
            receivedFrom,
            incomeAmountInGivenCurrency: incomeAmount,
            incomeAmountCurrency: incomeAmountCurrencyCode,
            incomeAmountInBaseCurrency: incomeAmountInDefaultCurrency,
            incomeAmountInCADCurrency: incomeAmountInCADCurrency,
            baseCurrency: user.defaultCurrencyCode,
            recurringType,
            nextDueDate,
            customRecurringUnit,
            customRecurringInterval,
            customRecurringDays,
            incomeDate,
            customRecurringStartDate,
            customRecurringEndDate,
            updatedAt: incomeDate,
            fkBankId: bankId,
          },
        });

        if (recurringType !== 'NoRecurring') {
          await this.createHistoricalTransactions(
            prisma,
            new Date(incomeDate),
            income,
            transactionData,
            recurringType,
            customRecurringUnit,
            customRecurringInterval,
            customRecurringDays,
            customRecurringStartDate,
            customRecurringEndDate,
          );
        } else {
          await prisma.transactions.create({
            data: {
              ...transactionData,
              fkIncomeId: income.incomeId,
              transactionType: 'INCOME',
              createdAt: new Date(incomeDate),
              updatedAt: new Date(incomeDate),
            },
          });
        }

        const transactionCount = await prisma.transactions.count({
          where: { fkIncomeId: income.incomeId },
        });

        await this.bankService.updateBankAccountBalance(
          bankId,
          incomeAmount * transactionCount,
          incomeAmountCurrencyCode,
          'ADD',
          userId,
          BankOperationType.INCOME,
        );

        return income;
      });

      await this.netWorthService.storeNetWorthHistory(userId);
      return newIncome;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error(error);
      throw new InternalServerErrorException('Could not add income');
    }
  }

  async editIncome(
    userId: number,
    incomeId: number,
    editIncomeDto: EditIncomeDto,
  ) {
    try {
      if (!editIncomeDto || Object.keys(editIncomeDto).length === 0) {
        throw new BadRequestException('No fields provided for update');
      }

      const existingIncome = await this.prisma.income.findUnique({
        where: { incomeId },
      });

      if (!existingIncome) {
        throw new NotFoundException('Income record not found');
      }

      if (existingIncome.fkUserId !== userId) {
        throw new ForbiddenException('You are not allowed to edit this income');
      }

      const {
        incomeAmount = existingIncome.incomeAmountInGivenCurrency,
        incomeAmountCurrencyCode = existingIncome.incomeAmountCurrency,
        bankId = existingIncome.fkBankId,
        recurringType = existingIncome.recurringType,
        customRecurringInterval,
        customRecurringUnit,
        customRecurringDays,
        customRecurringStartDate,
        customRecurringEndDate,
        ...incomeFields
      } = editIncomeDto;

      const user = await this.prisma.user.findUnique({
        where: { userId },
        select: { defaultCurrencyCode: true },
      });

      if (!user) throw new NotFoundException('User not found');

      let amountInDefaultCurrency = existingIncome.incomeAmountInBaseCurrency;
      let amountInCADCurrency = existingIncome.incomeAmountInCADCurrency;

      if (
        incomeAmount !== existingIncome.incomeAmountInGivenCurrency ||
        incomeAmountCurrencyCode !== existingIncome.incomeAmountCurrency
      ) {
        const conversions = await Promise.all([
          this.currencyConversionService.convertCurrency(
            incomeAmount,
            incomeAmountCurrencyCode,
            user.defaultCurrencyCode,
          ),
          this.currencyConversionService.convertCurrency(
            incomeAmount,
            incomeAmountCurrencyCode,
            'CAD',
          ),
        ]);
        amountInDefaultCurrency = conversions[0].convertedAmount;
        amountInCADCurrency = conversions[1].convertedAmount;
      }

      const isRecurringTypeChanged =
        recurringType !== existingIncome.recurringType;
      const nextDueDate = getNextDueDateForIncome(
        recurringType,
        editIncomeDto.incomeDate || new Date(),
        customRecurringUnit,
        customRecurringInterval,
        customRecurringDays,
        customRecurringStartDate,
        customRecurringEndDate,
      );

      const updateData: any = {
        ...incomeFields,
        incomeAmountInGivenCurrency: incomeAmount,
        incomeAmountCurrency: incomeAmountCurrencyCode,
        incomeAmountInBaseCurrency: amountInDefaultCurrency,
        incomeAmountInCADCurrency: amountInCADCurrency,
        fkBankId: bankId,
        recurringType,
        nextDueDate,
        updatedAt: new Date(),
      };

      if (recurringType === 'Custom') {
        if (customRecurringInterval !== undefined) {
          updateData.customRecurringInterval = customRecurringInterval;
        }
        if (customRecurringUnit !== undefined) {
          updateData.customRecurringUnit = customRecurringUnit;
        }
        if (customRecurringDays !== undefined) {
          updateData.customRecurringDays = customRecurringDays;
        }
        if (customRecurringStartDate !== undefined) {
          updateData.customRecurringStartDate = customRecurringStartDate;
        }
        if (customRecurringEndDate !== undefined) {
          updateData.customRecurringEndDate = customRecurringEndDate;
        }
      } else if (isRecurringTypeChanged) {
        updateData.customRecurringInterval = null;
        updateData.customRecurringUnit = null;
        updateData.customRecurringDays = [];
        updateData.customRecurringStartDate = null;
        updateData.customRecurringEndDate = null;
      }

      const updatedIncome = await this.prisma.income.update({
        where: { incomeId },
        data: updateData,
      });
      return updatedIncome;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error(error);
      throw new InternalServerErrorException('Could not update income');
    }
  }
  async deleteIncome(userId: number, incomeId: number): Promise<void> {
    try {
      const existingIncome = await this.prisma.income.findUnique({
        where: { incomeId, isDeleted: false },
      });
      if (!existingIncome) {
        throw new NotFoundException('Income record not found');
      }
      if (existingIncome.fkUserId !== userId) {
        throw new ForbiddenException(
          'You are not allowed to delete this income',
        );
      }
      await this.prisma.$transaction(async (prisma) => {
        await prisma.income.update({
          where: { incomeId },
          data: { isDeleted: true, nextDueDate: null },
        });
      });
    } catch (error) {
      console.error(`Error deleting income ${incomeId}:`, error);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Could not delete income');
    }
  }

  async getUserIncome(userId: number, filters: IncomeFilterDto) {
    try {
      const whereClause = {
        ...filterIncome(userId, filters),
      };
      if (filters.excludeNoRecurring) {
        whereClause.recurringType = {
          not: 'NoRecurring',
        };
      }
      const incomeList = await this.prisma.income.findMany({
        where: whereClause,
        orderBy: { incomeDate: 'desc' },
      });
      return incomeList;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Could not retrieve income');
    }
  }

  async getUserNetIncome(
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
        transactionType: 'INCOME',
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
        totalIncomeInCAD: +(aggregate._sum.amountInCADCurrency || 0).toFixed(3),
        totalIncomeCurrency: 'CAD',
        totalIncomeInDefaultCurrency: +(
          aggregate._sum.amountInBaseCurrency || 0
        ).toFixed(3),
        defaultCurrency: user.defaultCurrencyCode,
      };
    } catch (error) {
      console.error('Error retrieving user net income:', error);
      throw new InternalServerErrorException('Failed to retrieve net income');
    }
  }
  private async createHistoricalTransactions(
    prisma,
    startDate: Date,
    income: Income,
    transactionData: any,
    recurringType: string,
    customRecurringUnit?: number,
    customRecurringInterval?: CustomRecurringInterval,
    customRecurringDays?: CustomRecurringDays[],
    customRecurringStartDate?: Date,
    customRecurringEndDate?: Date,
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
      const nextDate = getNextDueDateForIncome(
        recurringType,
        currentDate,
        customRecurringUnit,
        customRecurringInterval,
        customRecurringDays,
        customRecurringStartDate,
        customRecurringEndDate,
      );
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
          transactionType: 'INCOME',
          createdAt: date,
          updatedAt: date,
          fkIncomeId: income.incomeId,
        },
      });
    }
  }
}
