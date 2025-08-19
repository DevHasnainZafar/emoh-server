import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { BankOperationType, TransactionsType } from '@prisma/client';
import { CurrencyConversionService } from 'src/common/services/currencyConversion.service';
import { NetWorthService } from 'src/common/services/net-worth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { getStartDateByTimePeriod } from 'src/utils/dateFilter.util';
import { EditTransactionDto } from './dtos/edit-transaction.dto';
import { ConfigService } from '@nestjs/config';
import { OpenAIService } from 'src/common/services/openai.service';
import { BankService } from 'src/bank/bank.service';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyConversionService: CurrencyConversionService,
    private readonly netWorthService: NetWorthService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => BankService))
    private readonly bankService: BankService,
    private readonly openaiService?: OpenAIService,
  ) {}

  async getUserTransactions(
    userId: number,
    transactionType?: TransactionsType,
    isPlaidTransaction?: boolean,
    isUncategorized?: boolean,
    timePeriod?:
      | 'today'
      | 'yesterday'
      | 'weekly'
      | 'last15days'
      | 'monthly'
      | 'yearly'
      | '2years'
      | '3years'
      | '4years'
      | 'custom',
    customStartDate?: Date,
    fkBankId?: number,
  ) {
    try {
      const whereClause: any = {
        fkUserId: userId,
        isDeleted: false,
      };

      if (transactionType) {
        whereClause.transactionType = transactionType;
      }

      if (isPlaidTransaction !== undefined) {
        whereClause.isPlaidTransaction = isPlaidTransaction;
      }

      if (isUncategorized !== undefined) {
        whereClause.isUncategorized = isUncategorized;
      }

      if (timePeriod) {
        const startDate = getStartDateByTimePeriod(timePeriod, customStartDate);
        whereClause.createdAt = { gte: startDate };
      }
      if (fkBankId !== undefined) {
        whereClause.fkBankId = fkBankId;
      }
      const transactions = await this.prisma.transactions.findMany({
        where: whereClause,
        orderBy: [{ updatedAt: 'desc' }],
        include: {
          bank: true,
        },
      });

      if (transactions.length === 0) {
        throw new NotFoundException('No transactions found for the user');
      }

      return transactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch transactions');
    }
  }

  async editTransaction(
    userId: number,
    transactionId: string,
    editTransactionDto: EditTransactionDto,
  ) {
    try {
      if (!editTransactionDto || Object.keys(editTransactionDto).length === 0) {
        throw new BadRequestException('No fields provided for update');
      }
      const existingTransaction = await this.prisma.transactions.findUnique({
        where: { transactionId },
        include: {
          income: true,
          expense: true,
          bank: true,
        },
      });

      if (!existingTransaction) {
        throw new NotFoundException('Transaction not found');
      }
      if (existingTransaction.fkUserId !== userId) {
        throw new ForbiddenException(
          'You are not allowed to edit this transaction',
        );
      }
      const {
        amountInGivenCurrency = existingTransaction.amountInGivenCurrency,
        amountCurrency = existingTransaction.amountCurrency,
        fkBankId = existingTransaction.fkBankId,
        partyName = existingTransaction.partyName,
        categoryName = existingTransaction.categoryName,
        transactionDate = existingTransaction.createdAt,
        ...rest
      } = editTransactionDto;
      const transactionType = existingTransaction.transactionType;
      const user = await this.prisma.user.findUnique({
        where: { userId },
        select: { defaultCurrencyCode: true },
      });
      if (!user) throw new NotFoundException('User not found');
      let amountInDefaultCurrency = existingTransaction.amountInBaseCurrency;
      let amountInCADCurrency = existingTransaction.amountInCADCurrency;
      let exchangeRateForBaseCurrency =
        existingTransaction.exchangeRateForBaseCurrency;
      let exchangeRateForCAD = existingTransaction.exchangeRateForCAD;

      const amountChanged =
        amountInGivenCurrency !== existingTransaction.amountInGivenCurrency ||
        amountCurrency !== existingTransaction.amountCurrency;

      if (amountChanged) {
        const conversions = await Promise.all([
          this.currencyConversionService.convertCurrency(
            amountInGivenCurrency,
            amountCurrency,
            user.defaultCurrencyCode,
          ),
          this.currencyConversionService.convertCurrency(
            amountInGivenCurrency,
            amountCurrency,
            'CAD',
          ),
        ]);
        amountInDefaultCurrency = conversions[0].convertedAmount;
        exchangeRateForBaseCurrency = conversions[0].exchangeRate;
        amountInCADCurrency = conversions[1].convertedAmount;
        exchangeRateForCAD = conversions[1].exchangeRate;
      }
      return await this.prisma.$transaction(async (prisma) => {
        const isIncome = transactionType === 'INCOME';
        const originalAmount = existingTransaction.amountInGivenCurrency;
        const originalCurrency = existingTransaction.amountCurrency;
        const bankChanged = fkBankId !== existingTransaction.fkBankId;
        const sameBank = fkBankId === existingTransaction.fkBankId;
        const amountDiff = amountInGivenCurrency - originalAmount;
        if (bankChanged || amountChanged) {
          if (sameBank && fkBankId) {
            if (amountDiff !== 0) {
              const operationType = isIncome
                ? amountDiff > 0
                  ? 'ADD'
                  : 'DEDUCT'
                : amountDiff > 0
                  ? 'DEDUCT'
                  : 'ADD';
              await this.bankService.updateBankAccountBalance(
                fkBankId,
                Math.abs(amountDiff),
                amountCurrency,
                operationType,
                userId,
                isIncome ? BankOperationType.INCOME : BankOperationType.EXPENSE,
              );
            }
          } else {
            if (existingTransaction.fkBankId) {
              const reverseType = isIncome ? 'DEDUCT' : 'ADD';
              await this.bankService.updateBankAccountBalance(
                existingTransaction.fkBankId,
                originalAmount,
                originalCurrency,
                reverseType,
                userId,
                isIncome ? BankOperationType.INCOME : BankOperationType.EXPENSE,
              );
            }
            if (fkBankId) {
              const applyType = isIncome ? 'ADD' : 'DEDUCT';
              await this.bankService.updateBankAccountBalance(
                fkBankId,
                amountInGivenCurrency,
                amountCurrency,
                applyType,
                userId,
                isIncome ? BankOperationType.INCOME : BankOperationType.EXPENSE,
              );
            }
          }
        }
        const updatedTransaction = await prisma.transactions.update({
          where: { transactionId },
          data: {
            amountInGivenCurrency,
            amountCurrency,
            amountInBaseCurrency: amountInDefaultCurrency,
            amountInCADCurrency,
            exchangeRateForBaseCurrency,
            exchangeRateForCAD,
            fkBankId,
            partyName,
            categoryName,
            createdAt: transactionDate,
            updatedAt: new Date(),
          },
        });

        let bankInfo: { accountName: string; accountImage: string } | null =
          null;
        if (fkBankId) {
          const bank = await prisma.bank.findUnique({
            where: { bankId: fkBankId },
            select: { accountName: true, accountImage: true },
          });
          if (bank) {
            bankInfo = {
              accountName: bank.accountName,
              accountImage: bank.accountImage,
            };
          }
        }
        if (
          existingTransaction.fkIncomeId &&
          existingTransaction.income?.recurringType === 'NoRecurring'
        ) {
          await prisma.income.update({
            where: {
              incomeId: existingTransaction.fkIncomeId,
            },
            data: {
              incomeAmountInGivenCurrency: amountInGivenCurrency,
              incomeAmountCurrency: amountCurrency,
              incomeAmountInBaseCurrency: amountInDefaultCurrency,
              incomeAmountInCADCurrency: amountInCADCurrency,
              receivedIn: bankInfo?.accountName,
              receivedInBankImage: bankInfo?.accountImage,
              receivedFrom: partyName,
              categoryName: categoryName,
              fkBankId: editTransactionDto.fkBankId,
              updatedAt: new Date(),
            },
          });
        }
        if (
          existingTransaction.fkExpenseId &&
          existingTransaction.expense?.recurringType === 'NoRecurring'
        ) {
          await prisma.expense.update({
            where: {
              expenseId: existingTransaction.fkExpenseId,
            },
            data: {
              expenseAmountInGivenCurrency: amountInGivenCurrency,
              expenseAmountCurrency: amountCurrency,
              expenseAmountInBaseCurrency: amountInDefaultCurrency,
              expenseAmountInCADCurrency: amountInCADCurrency,
              paidFrom: bankInfo?.accountName,
              paidFromImage: bankInfo?.accountImage,
              fkBankId: editTransactionDto.fkBankId,
              paidTo: partyName,
              paidToCategory: categoryName,
              updatedAt: new Date(),
            },
          });
        }
        await this.netWorthService.storeNetWorthHistory(userId);
        return updatedTransaction;
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
      throw new InternalServerErrorException('Could not update transaction');
    }
  }

  async deleteTransaction(userId: number, transactionId: string) {
    try {
      const existingTransaction = await this.prisma.transactions.findUnique({
        where: { transactionId },
        include: {
          income: true,
          expense: true,
          bank: true,
        },
      });

      if (!existingTransaction) {
        throw new NotFoundException('Transaction not found');
      }
      if (existingTransaction.fkUserId !== userId) {
        throw new ForbiddenException(
          'You are not allowed to delete this transaction',
        );
      }
      return await this.prisma.$transaction(async (prisma) => {
        const isIncome = existingTransaction.transactionType === 'INCOME';
        const amount = existingTransaction.amountInGivenCurrency;
        const currency = existingTransaction.amountCurrency;
        if (existingTransaction.fkBankId) {
          const operationType = isIncome ? 'DEDUCT' : 'ADD';
          await this.bankService.updateBankAccountBalance(
            existingTransaction.fkBankId,
            amount,
            currency,
            operationType,
            userId,
            isIncome ? BankOperationType.INCOME : BankOperationType.EXPENSE,
          );
        }
        if (existingTransaction.fkIncomeId) {
          await prisma.income.delete({
            where: { incomeId: existingTransaction.fkIncomeId },
          });
        }

        if (existingTransaction.fkExpenseId) {
          await prisma.expense.delete({
            where: { expenseId: existingTransaction.fkExpenseId },
          });
        }
        const deletedTransaction = await prisma.transactions.update({
          where: { transactionId },
          data: {
            isDeleted: true,
            updatedAt: new Date(),
          },
        });
        await this.netWorthService.storeNetWorthHistory(userId);
        return deletedTransaction;
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      console.error(error);
      throw new InternalServerErrorException('Could not delete transaction');
    }
  }

  classifyTransaction(transaction: any): 'INCOME' | 'EXPENSE' {
    this.logger.debug(`Classifying transaction: ${transaction.transaction_id}`);
    const { amount, category = [], personal_finance_category } = transaction;
    if (personal_finance_category?.primary) {
      const primaryCat = personal_finance_category.primary.toUpperCase();
      if (['INCOME', 'TRANSFER_IN', 'DEPOSIT'].includes(primaryCat)) {
        return 'INCOME';
      }
      if (
        [
          'EXPENSE',
          'TRANSFER_OUT',
          'LOAN',
          'INVESTMENT',
          'PAYMENT',
          'PURCHASE',
          'SERVICE',
          'FEE',
        ].includes(primaryCat)
      ) {
        return 'EXPENSE';
      }
    }
    const joinedCategories = category.join('|').toLowerCase();
    const incomePatterns = [
      'salary',
      'payroll',
      'interest',
      'dividend',
      'deposit',
      'refund',
      'reimbursement',
      'government',
      'benefit',
      'income',
      'insurance',
    ];
    if (incomePatterns.some((pattern) => joinedCategories.includes(pattern))) {
      return 'INCOME';
    }
    const expensePatterns = [
      'restaurant',
      'grocery',
      'store',
      'shop',
      'payment',
      'fee',
      'service',
      'utility',
      'rent',
      'mortgage',
      'loan',
      'credit',
      'tax',
      'medical',
      'transport',
      'health & fitness',
    ];
    if (expensePatterns.some((pattern) => joinedCategories.includes(pattern))) {
      return 'EXPENSE';
    }
    if (category.includes('Transfer')) {
      return amount > 0 ? 'INCOME' : 'EXPENSE';
    }
    return amount < 0 ? 'INCOME' : 'EXPENSE';
  }
  async processTransaction(userId: number, transaction: any) {
    const {
      amount,
      category = [],
      personal_finance_category,
      date,
      name,
      transaction_id,
      iso_currency_code,
      counterparties,
      account_id,
    } = transaction;
    if (!transaction_id || !amount || !date) {
      return {
        success: false,
        message: 'Missing required transaction fields',
      };
    }
    const bankAccount = await this.prisma.bank.findFirst({
      where: {
        plaidAccountId: account_id,
        fkUserId: userId,
        isArchived: false,
      },
      select: {
        bankId: true,
        accountCurrencyCode: true,
        plaidAccountId: true,
        isCreditAccount: true,
      },
    });

    if (!bankAccount) {
      return {
        success: false,
        message: 'Bank account not found for this transaction',
      };
    }
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: { defaultCurrencyCode: true },
    });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    try {
      const [
        { convertedAmount: amountInDefaultCurrency },
        { convertedAmount: amountInCADCurrency },
      ] = await Promise.all([
        this.currencyConversionService.convertCurrency(
          amount,
          iso_currency_code,
          user.defaultCurrencyCode,
        ),
        this.currencyConversionService.convertCurrency(
          amount,
          iso_currency_code,
          'CAD',
        ),
      ]);

      const transactionType = this.classifyTransaction(transaction);
      const logoUrl = this.getLogoUrl(transaction);
      const counterpartyName = counterparties?.[0]?.name;
      const plaidCategory = category?.[0] || 'Unknown';
      this.logger.debug(`Determining transaction category`);
      const { customCategory, isUncategorized } =
        await this.determineTransactionCategory(plaidCategory, {
          name,
          counterpartyName,
        });
      const finalCategoryName = isUncategorized
        ? 'Uncategorized'
        : customCategory;
      const transactionData = {
        transactionId: transaction_id,
        transactionType,
        amountInGivenCurrency: amount,
        amountCurrency: iso_currency_code,
        amountInBaseCurrency: amountInDefaultCurrency,
        BaseCurrency: user.defaultCurrencyCode,
        amountInCADCurrency: amountInCADCurrency,
        CADCurrency: 'CAD',
        createdAt: new Date(date),
        updatedAt: new Date(date),
        isPlaidTransaction: true,
        isDeleted: false,
        fkBankId: bankAccount.bankId,
        fkUserId: userId,
        categoryName: finalCategoryName,
        partyName: name,
        isUncategorized: isUncategorized,
      };
      this.logger.debug(`Checking for existing transaction`);
      const existingTransaction = await this.prisma.transactions.findUnique({
        where: { transactionId: transaction_id },
      });

      if (existingTransaction) {
        if (existingTransaction.isDeleted) {
          this.logger.log(
            `Restoring soft-deleted transaction: ${transaction_id}`,
          );
          const updatedTransaction = await this.prisma.transactions.update({
            where: { transactionId: transaction_id },
            data: {
              ...transactionData,
              isDeleted: false,
            },
          });
          if (bankAccount.isCreditAccount && transactionType === 'EXPENSE') {
            await this.prisma.bank.update({
              where: { bankId: bankAccount.bankId },
              data: {
                creditAccountLiabilityInDefaultCurrency: {
                  increment: amountInDefaultCurrency,
                },
                creditAccountLiabilityInCAD: {
                  increment: amountInCADCurrency,
                },
              },
            });
          }
          if (transactionType === 'INCOME') {
            await this.prisma.income.updateMany({
              data: {
                isDeleted: false,
                categoryName: customCategory,
              },
            });
          } else {
            await this.prisma.expense.updateMany({
              data: {
                isDeleted: false,
                paidToCategory: customCategory,
              },
            });
          }
          this.logger.log(
            `Transaction was soft-deleted and has been restored successfully`,
            {
              transaction_id,
            },
          );
          return {
            success: true,
            message: 'Transaction was soft-deleted and has been restored',
            transaction: updatedTransaction,
          };
        } else {
          this.logger.debug(`Transaction already exists and was skipped`);
          return {
            success: false,
            message: 'Transaction already exists and was skipped',
            transaction: existingTransaction,
          };
        }
      }
      this.logger.debug(`Creating new transaction record`, { transaction_id });
      const newTransaction = await this.prisma.transactions.create({
        data: transactionData,
      });
      if (transactionType === 'INCOME') {
        const income = await this.prisma.income.create({
          data: {
            fkUserId: userId,
            fkBankId: bankAccount.bankId,
            receivedIn: name || 'Unknown income source',
            receivedInBankImage: logoUrl,
            receivedFrom: counterpartyName || plaidCategory || 'Unknown',
            categoryName: customCategory,
            recurringType: 'NoRecurring',
            incomeDate: new Date(date),
            updatedAt: new Date(date),
            incomeAmountInBaseCurrency: amountInDefaultCurrency,
            incomeAmountInCADCurrency: amountInCADCurrency,
            incomeAmountInGivenCurrency: amount,
            baseCurrency: user.defaultCurrencyCode,
            incomeAmountCurrency: iso_currency_code,
            isPlaidIncome: true,
          },
        });
        await this.prisma.transactions.update({
          where: { transactionId: newTransaction.transactionId },
          data: { fkIncomeId: income.incomeId },
        });
        return {
          success: true,
          message: 'Income transaction created successfully',
          income,
          transaction: { ...newTransaction, fkIncomeId: income.incomeId },
        };
      } else {
        const expense = await this.prisma.expense.create({
          data: {
            fkUserId: userId,
            fkBankId: bankAccount.bankId,
            paidFrom: name || 'Unknown payment',
            paidFromImage: logoUrl,
            paidTo: counterpartyName || plaidCategory || 'Unknown',
            paidToCategory: customCategory,
            taxStatus: 'Out_Of_Scope',
            fxMarkupStatus: 'Out_Of_Scope',
            expenseDate: new Date(date),
            createdDate: new Date(date),
            updatedAt: new Date(date),
            recurringType: 'NoRecurring',
            isPlaidExpense: true,
            expenseAmountInBaseCurrency: amountInDefaultCurrency,
            expenseAmountInCADCurrency: amountInCADCurrency,
            expenseAmountInGivenCurrency: amount,
            baseCurrency: user.defaultCurrencyCode,
            expenseAmountCurrency: iso_currency_code,
          },
        });
        await this.prisma.transactions.update({
          where: { transactionId: newTransaction.transactionId },
          data: { fkExpenseId: expense.expenseId },
        });
        if (bankAccount.isCreditAccount) {
          await this.prisma.bank.update({
            where: { bankId: bankAccount.bankId },
            data: {
              creditAccountLiabilityInDefaultCurrency: {
                increment: amountInDefaultCurrency,
              },
              creditAccountLiabilityInCAD: {
                increment: amountInCADCurrency,
              },
            },
          });
        }
        return {
          success: true,
          message: 'Expense transaction created successfully',
          expense,
          transaction: { ...newTransaction, fkExpenseId: expense.expenseId },
        };
      }
    } catch (error) {
      this.logger.error(`Failed to process transaction: ${transaction_id}`, {
        error: error.message,
        stack: error.stack,
        userId,
      });
      return {
        success: false,
        message: 'Failed to process transaction',
        error: error.message,
      };
    }
  }

  private async determineTransactionCategory(
    plaidCategory: string,
    transactionDetails: {
      name: string;
      counterpartyName?: string;
    },
  ): Promise<{ customCategory: string; isUncategorized: boolean }> {
    const categoryMapping = await this.prisma.plaidCategoryMapping.findFirst({
      where: {
        plaidCategory: {
          equals: plaidCategory,
          mode: 'insensitive',
        },
      },
    });
    if (categoryMapping) {
      return {
        customCategory: categoryMapping.customCategory,
        isUncategorized: false,
      };
    }
    if (this.openaiService && this.configService.get('OPENAI_API_KEY')) {
      this.logger.debug('Attempting AI categorization');
      try {
        const details = {
          transactionName: transactionDetails.name,
          originalCategory: plaidCategory,
          counterparty: transactionDetails.counterpartyName,
        };

        const aiCategory = await this.openaiService.categorizeTransaction(
          JSON.stringify(details),
        );
        if (aiCategory !== 'Uncategorized / Miscellaneous') {
          await this.prisma.plaidCategoryMapping.create({
            data: {
              plaidCategory,
              customCategory: aiCategory,
            },
          });
          this.logger.log(`Created new category mapping`, {
            plaidCategory,
            customCategory: aiCategory,
          });
        }
        return {
          customCategory: aiCategory,
          isUncategorized: aiCategory === 'Uncategorized / Miscellaneous',
        };
      } catch (error) {
        console.error('AI categorization failed:', error);
      }
    }
    return {
      customCategory: 'Uncategorized / Miscellaneous',
      isUncategorized: true,
    };
  }
  getLogoUrl(transaction: any): string {
    if (transaction.counterparties && transaction.counterparties.length > 0) {
      const counterparty = transaction.counterparties[0];
      if (counterparty.logo_url) {
        return counterparty.logo_url;
      }
    }
    if (transaction.merchant_entity_id && transaction.logo_url) {
      return transaction.logo_url;
    }
    if (transaction.institution_logo_url) {
      return transaction.institution_logo_url;
    }
    return transaction.personal_finance_category_icon_url || '';
  }
}
