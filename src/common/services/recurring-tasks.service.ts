import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  calculateBudgetEndDate,
  getNextDueDateForBudget,
  getNextDueDateForIncome,
} from 'src/utils/methods';
import { NetWorthService } from 'src/common/services/net-worth.service';
import { BankService } from 'src/bank/bank.service';
import { SyncType } from 'src/constants/Endpoints';
import { CurrencyConversionService } from 'src/common/services/currencyConversion.service';
import { CustomRecurringInterval } from '@prisma/client';

@Injectable()
export class RecurringTasksService {
  private readonly logger = new Logger(RecurringTasksService.name);

  constructor(
    private prisma: PrismaService,
    private readonly netWorthService: NetWorthService,
    private readonly bankService: BankService,
    private readonly currencyConversionService: CurrencyConversionService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleRecurringTransactions() {
    this.logger.log('Checking for recurring incomes and expenses...');
    const now = new Date();
    await this.processRecurringIncomes(now);
    await this.processRecurringExpenses(now);
    await this.processRecurringBudgets(now);
    await this.syncPlaidBankAccounts();
  }
  private async syncPlaidBankAccounts() {
    this.logger.log('Syncing Plaid bank accounts...');
    const plaidBankAccounts = await this.prisma.bank.findMany({
      where: {
        isPlaidAccount: true,
        plaidItemId: { not: null },
        plaidAccountId: { not: null },
        isArchived: false,
      },
    });
    for (const bankAccount of plaidBankAccounts) {
      try {
        await this.bankService.syncPlaidAccount(
          bankAccount.fkUserId,
          bankAccount.bankId,
          SyncType.CRON,
        );
        this.logger.log(
          `Synced Plaid bank account ${bankAccount.bankId} for user ${bankAccount.fkUserId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to sync Plaid bank account ${bankAccount.bankId}: ${error.message}`,
        );
      }
    }
  }

  private async processRecurringIncomes(now: Date) {
    this.logger.log('Processing recurring incomes...');
    const recurringIncomes = await this.prisma.income.findMany({
      where: {
        recurringType: { not: 'NoRecurring' },
        nextDueDate: { lte: now },
        isDeleted: false,
      },
      include: {
        user: true,
      },
    });
    for (const income of recurringIncomes) {
      try {
        const {
          incomeAmountInGivenCurrency,
          incomeAmountCurrency,
          baseCurrency,
        } = income;
        let amountInBaseCurrency: number;
        let amountInCADCurrency: number;
        if (
          incomeAmountCurrency === baseCurrency &&
          incomeAmountCurrency === 'CAD'
        ) {
          amountInBaseCurrency = incomeAmountInGivenCurrency;
          amountInCADCurrency = incomeAmountInGivenCurrency;
        } else {
          if (incomeAmountCurrency !== baseCurrency) {
            const { convertedAmount } =
              await this.currencyConversionService.convertCurrency(
                incomeAmountInGivenCurrency,
                incomeAmountCurrency,
                baseCurrency,
              );
            amountInBaseCurrency = convertedAmount;
          } else {
            amountInBaseCurrency = incomeAmountInGivenCurrency;
          }
          if (incomeAmountCurrency !== 'CAD') {
            const { convertedAmount } =
              await this.currencyConversionService.convertCurrency(
                incomeAmountInGivenCurrency,
                incomeAmountCurrency,
                'CAD',
              );
            amountInCADCurrency = convertedAmount;
          } else {
            amountInCADCurrency = incomeAmountInGivenCurrency;
          }
        }
        const newTransaction = await this.prisma.transactions.create({
          data: {
            transactionType: 'INCOME',
            amountInGivenCurrency: incomeAmountInGivenCurrency,
            amountCurrency: incomeAmountCurrency,
            amountInBaseCurrency,
            BaseCurrency: baseCurrency,
            amountInCADCurrency,
            CADCurrency: 'CAD',
            fkIncomeId: income.incomeId,
            fkBankId: income.fkBankId,
            fkUserId: income.fkUserId,
            createdAt: now,
            updatedAt: now,
            partyName: income.receivedFrom,
            categoryName: income.categoryName,
          },
        });
        if (income.fkBankId) {
          await this.bankService.updateBankAccountBalance(
            income.fkBankId,
            incomeAmountInGivenCurrency,
            incomeAmountCurrency,
            'ADD',
            income.fkUserId,
          );
        }
        const nextDueDate = getNextDueDateForIncome(
          income.recurringType,
          new Date(),
          income.customRecurringUnit as number,
          income.customRecurringInterval as CustomRecurringInterval,
          income.customRecurringDays,
          income.customRecurringStartDate as Date,
          income.customRecurringEndDate as Date,
        );

        await this.prisma.income.update({
          where: { incomeId: income.incomeId },
          data: {
            nextDueDate,
            updatedAt: now,
          },
        });
        await this.netWorthService.storeNetWorthHistory(income.fkUserId);
        this.logger.log(
          `Processed recurring income ${income.incomeId} for user ${income.fkUserId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process recurring income ${income.incomeId}: ${error.message}`,
        );
      }
    }
  }

  private async processRecurringExpenses(now: Date) {
    this.logger.log('Processing recurring expenses...');
    const recurringExpenses = await this.prisma.expense.findMany({
      where: {
        recurringType: { not: 'NoRecurring' },
        nextDueDate: { lte: now },
        isDeleted: false,
      },
      include: {
        user: true,
        bank: true,
      },
    });
    for (const expense of recurringExpenses) {
      try {
        const {
          expenseAmountInGivenCurrency,
          expenseAmountCurrency,
          baseCurrency,
        } = expense;
        let amountInBaseCurrency: number;
        let amountInCADCurrency: number;
        if (
          expenseAmountCurrency === baseCurrency &&
          expenseAmountCurrency === 'CAD'
        ) {
          amountInBaseCurrency = expenseAmountInGivenCurrency;
          amountInCADCurrency = expenseAmountInGivenCurrency;
        } else {
          if (expenseAmountCurrency !== baseCurrency) {
            const { convertedAmount } =
              await this.currencyConversionService.convertCurrency(
                expenseAmountInGivenCurrency,
                expenseAmountCurrency,
                baseCurrency,
              );
            amountInBaseCurrency = convertedAmount;
          } else {
            amountInBaseCurrency = expenseAmountInGivenCurrency;
          }
          if (expenseAmountCurrency !== 'CAD') {
            const { convertedAmount } =
              await this.currencyConversionService.convertCurrency(
                expenseAmountInGivenCurrency,
                expenseAmountCurrency,
                'CAD',
              );
            amountInCADCurrency = convertedAmount;
          } else {
            amountInCADCurrency = expenseAmountInGivenCurrency;
          }
        }
        const newTransaction = await this.prisma.transactions.create({
          data: {
            transactionType: 'EXPENSE',
            amountInGivenCurrency: expenseAmountInGivenCurrency,
            amountCurrency: expenseAmountCurrency,
            amountInBaseCurrency,
            BaseCurrency: baseCurrency,
            amountInCADCurrency,
            CADCurrency: 'CAD',
            fkExpenseId: expense.expenseId,
            fkUserId: expense.fkUserId,
            fkBankId: expense.fkBankId,
            createdAt: now,
            updatedAt: now,
            partyName: expense.paidTo,
            categoryName: expense.paidToCategory,
          },
        });

        if (expense.fkBankId) {
          if (expense.bank?.isCreditAccount) {
            await this.prisma.bank.update({
              where: { bankId: expense.fkBankId },
              data: {
                creditAccountLiabilityInDefaultCurrency: {
                  increment: amountInBaseCurrency,
                },
                creditAccountLiabilityInCAD: {
                  increment: amountInCADCurrency,
                },
                accountAmount: {
                  decrement: expenseAmountInGivenCurrency,
                },
                accountAmountInDefaultCurrency: {
                  decrement: amountInBaseCurrency,
                },
                accountAmountInCADCurrency: {
                  decrement: amountInCADCurrency,
                },
              },
            });
          } else {
            await this.bankService.updateBankAccountBalance(
              expense.fkBankId,
              expenseAmountInGivenCurrency,
              expenseAmountCurrency,
              'DEDUCT',
              expense.fkUserId,
            );
          }
        }
        const nextDueDate = getNextDueDateForIncome(expense.recurringType, now);
        await this.prisma.expense.update({
          where: { expenseId: expense.expenseId },
          data: {
            nextDueDate,
            updatedAt: now,
          },
        });
        await this.netWorthService.storeNetWorthHistory(expense.fkUserId);
        this.logger.log(
          `Processed recurring expense ${expense.expenseId} for user ${expense.fkUserId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process recurring expense ${expense.expenseId}: ${error.message}`,
        );
      }
    }
  }

  private async processRecurringBudgets(now: Date) {
    this.logger.log('Processing recurring budgets...');
    const recurringBudgets = await this.prisma.budget.findMany({
      where: {
        nextDueDate: { lte: now },
        isDeleted: false,
      },
      include: {
        user: true,
        budgetLogs: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    for (const budget of recurringBudgets) {
      try {
        const previousLog = budget.budgetLogs[0];
        if (previousLog) {
          await this.prisma.budgetLog.update({
            where: { logId: previousLog.logId },
            data: { isActive: false },
          });
        }
        const {
          budgetAmountInGivenCurrency,
          budgetAmountCurrency,
          baseCurrency,
        } = budget;
        let budgetAmountInBaseCurrency: number;
        let budgetAmountInCADCurrency: number;
        if (
          budgetAmountCurrency === baseCurrency &&
          budgetAmountCurrency === 'CAD'
        ) {
          budgetAmountInBaseCurrency = budgetAmountInGivenCurrency;
          budgetAmountInCADCurrency = budgetAmountInGivenCurrency;
        } else {
          if (budgetAmountCurrency !== baseCurrency) {
            const { convertedAmount } =
              await this.currencyConversionService.convertCurrency(
                budgetAmountInGivenCurrency,
                budgetAmountCurrency,
                baseCurrency,
              );
            budgetAmountInBaseCurrency = convertedAmount;
          } else {
            budgetAmountInBaseCurrency = budgetAmountInGivenCurrency;
          }
          if (budgetAmountCurrency !== 'CAD') {
            const { convertedAmount } =
              await this.currencyConversionService.convertCurrency(
                budgetAmountInGivenCurrency,
                budgetAmountCurrency,
                'CAD',
              );
            budgetAmountInCADCurrency = convertedAmount;
          } else {
            budgetAmountInCADCurrency = budgetAmountInGivenCurrency;
          }
        }
        const startDate = now;
        const endDate = calculateBudgetEndDate(
          startDate,
          budget.budgetContributionCycle,
        );
        const nextDueDate = getNextDueDateForBudget(
          budget.budgetContributionCycle,
          now,
        );
        await this.prisma.budgetLog.create({
          data: {
            fkBudgetId: budget.budgetId,
            fkUserId: budget.fkUserId,
            categoryName: budget.categoryName,
            budgetContributionCycle: budget.budgetContributionCycle,
            budgetAmountInGivenCurrency,
            budgetAmountCurrency,
            budgetAmountInBaseCurrency,
            baseCurrency,
            budgetAmountInCADCurrency,
            CADCurrency: 'CAD',
            startDate,
            endDate,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
        });
        await this.prisma.budget.update({
          where: { budgetId: budget.budgetId },
          data: {
            nextDueDate,
            updatedAt: new Date(),
          },
        });
        this.logger.log(
          `Processed ${budget.budgetContributionCycle} budget and created log for user ${budget.fkUserId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process budget ${budget.budgetId}: ${error.message}`,
        );
      }
    }
  }
}
