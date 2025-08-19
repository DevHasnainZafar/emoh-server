import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { currencyList } from 'src/dummy/currency';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBankAccountDto } from './dtos/create-bank-account.dto';
import { UpdateBankAccountDto } from './dtos/update-bank-account.dto';
import { CacheService } from '../common/services/cache.service';
import { AccountType, BankOperationType } from '@prisma/client';
import { CurrencyConversionService } from 'src/common/services/currencyConversion.service';
import { NetWorthService } from 'src/common/services/net-worth.service';
import { getStartDateByTimePeriod } from 'src/utils/dateFilter.util';
import { PlaidService } from 'src/plaid/plaid.service';
import { AddPlaidAccountDto } from './dtos/add-plaid-account.dto';
import { mapPlaidAccountType } from 'src/utils/methods';
import { SyncType } from 'src/constants/Endpoints';
import { FinancialItemsService } from 'src/financial-items/financial-items.service';
@Injectable()
export class BankService {
  private readonly logger = new Logger(BankService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly financialItemsService: FinancialItemsService,
    private readonly currencyConversionService: CurrencyConversionService,
    @Inject(forwardRef(() => NetWorthService))
    private readonly netWorthService: NetWorthService,
    private readonly plaidService: PlaidService,
  ) {}

  async addBankAccount(
    userId: number,
    createBankAccountDto: CreateBankAccountDto,
  ) {
    this.logger.log(`Starting to add bank account for user ${userId}`);
    try {
      const {
        accountAmount,
        accountCurrencyCode,
        accountType,
        isPlaidAccount = false,
        plaidAccountId,
        plaidItemId,
        plaidInstitutionId,
        ...rest
      } = createBankAccountDto;

      this.logger.debug(`Fetching user ${userId} details`);
      const user = await this.prisma.user.findUnique({
        where: { userId },
        select: { defaultCurrencyCode: true },
      });
      if (!user) {
        this.logger.warn(`User ${userId} not found`);
        throw new NotFoundException('User not found');
      }

      if (!isPlaidAccount && accountAmount === undefined) {
        this.logger.warn('Account amount missing for manual account');
        throw new BadRequestException(
          'Account amount is required for manual accounts',
        );
      }

      const isCreditAccount =
        accountType === 'Credit' || accountType === 'Loan';
      const amount = accountAmount || 0;
      const currencyCode = accountCurrencyCode || 'CAD';
      this.logger.debug(
        `Validating currency code: ${user.defaultCurrencyCode}`,
      );
      const validCurrencyCodeRegex = /^[A-Z]{3}$/;
      if (!validCurrencyCodeRegex.test(user.defaultCurrencyCode)) {
        this.logger.error(
          `Invalid currency format: ${user.defaultCurrencyCode}`,
        );
        throw new BadRequestException(
          `Invalid currency format: ${user.defaultCurrencyCode}. Expected a 3-letter currency code.`,
        );
      }
      this.logger.debug(`Converting currency for account`);
      const [
        {
          convertedAmount: defaultCurrencyAmount,
          exchangeRate: baseCurrencyRate,
        },
        { convertedAmount: cadCurrencyAmount, exchangeRate: cadRate },
      ] = await Promise.all([
        this.currencyConversionService.convertCurrency(
          amount,
          currencyCode,
          user.defaultCurrencyCode,
        ),
        this.currencyConversionService.convertCurrency(
          amount,
          currencyCode,
          'CAD',
        ),
      ]);
      this.logger.log(`Creating bank account in database`);
      const bankAccount = await this.prisma.$transaction(async (prisma) => {
        const newAccount = await prisma.bank.create({
          data: {
            ...rest,
            accountType,
            isCreditAccount,
            accountAmount: amount,
            accountCurrencyCode: currencyCode,
            creditAccountLiabilityInDefaultCurrency: isCreditAccount ? 0 : null,
            creditAccountLiabilityInCAD: isCreditAccount ? 0 : null,
            accountAmountInDefaultCurrency: defaultCurrencyAmount,
            exchangeRateForBaseCurrency: baseCurrencyRate,
            accountAmountInCADCurrency: cadCurrencyAmount,
            exchangeRateForCAD: cadRate,
            isPlaidAccount,
            plaidAccountId: plaidAccountId || null,
            plaidItemId: plaidItemId || null,
            plaidInstitutionId: plaidInstitutionId || null,
            fkUserId: userId,
          },
        });

        await prisma.bankHistory.create({
          data: {
            bankId: newAccount.bankId,
            accountName: newAccount.accountName,
            accountType: newAccount.accountType,
            isCreditAccount: newAccount.isCreditAccount,
            creditAccountLiabilityInDefaultCurrency: isCreditAccount ? 0 : null,
            creditAccountLiabilityInCAD: isCreditAccount ? 0 : null,
            accountImage: newAccount.accountImage,
            accountAmount: newAccount.accountAmount,
            accountCurrencyCode: newAccount.accountCurrencyCode,
            accountAmountInDefaultCurrency:
              newAccount.accountAmountInDefaultCurrency,
            exchangeRateForBaseCurrency: newAccount.exchangeRateForBaseCurrency,
            accountAmountInCADCurrency: newAccount.accountAmountInCADCurrency,
            exchangeRateForCAD: newAccount.exchangeRateForCAD,
            isPlaidAccount: newAccount.isPlaidAccount,
            plaidAccountId: newAccount.plaidAccountId,
            plaidItemId: newAccount.plaidItemId,
            plaidInstitutionId: newAccount.plaidInstitutionId,
            isArchived: newAccount.isArchived,
            fkUserId: newAccount.fkUserId,
            BankOperationType: BankOperationType.ADD,
            lastSyncAt: new Date(),
          },
        });
        return newAccount;
      });
      this.logger.debug(`Storing net worth history for user ${userId}`);
      await this.netWorthService.storeNetWorthHistory(userId);
      this.logger.log(`Successfully added bank account for user ${userId}`);
      return {
        bankAccount: {
          ...bankAccount,
          defaultCurrency: user.defaultCurrencyCode,
          cadCurrency: 'CAD',
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to add bank account for user ${userId}: ${error.message}`,
        error.stack,
      );
      console.error('Error adding bank account:', error);
      throw new InternalServerErrorException('Failed to create bank account');
    }
  }
  async addPlaidAccount(
    userId: number,
    addPlaidAccountDto: AddPlaidAccountDto,
  ) {
    this.logger.log(`Starting to add Plaid account for user ${userId}`);
    try {
      this.logger.debug(`Exchanging public token`);
      const accessToken = await this.plaidService.exchangePublicToken(
        addPlaidAccountDto.publicToken,
      );

      if (!accessToken) {
        this.logger.error('Failed to exchange public token');
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            message: 'Failed to exchange public token',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      this.logger.debug(`Fetching item details`);
      const itemResponse = await this.plaidService.getItemDetails(accessToken);
      const institutionId = itemResponse.institution_id;
      if (!institutionId) {
        this.logger.error('Institution ID not found');
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            message: 'Institution ID not found for the given access token',
          },
          HttpStatus.NOT_FOUND,
        );
      }
      this.logger.debug(`Fetching institution details: ${institutionId}`);
      const institution =
        await this.plaidService.getInstitutionDetails(institutionId);
      this.logger.debug(`Fetching account details`);
      const accounts = await this.plaidService.getAccountDetails(accessToken);
      if (!accounts || accounts.length === 0) {
        this.logger.error('No accounts found for access token');
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            message: 'No accounts found for the given access token',
          },
          HttpStatus.NOT_FOUND,
        );
      }
      this.logger.log(`Processing ${accounts.length} accounts`);
      const savedAccounts: any[] = [];
      for (const account of accounts) {
        const existingAccount = await this.prisma.bank.findFirst({
          where: {
            plaidAccountId: account.account_id,
            fkUserId: userId,
          },
        });
        if (existingAccount) {
          if (existingAccount.isArchived) {
            this.logger.debug(
              `Restoring archived account: ${account.account_id}`,
            );
            const updatedAccount = await this.prisma.bank.update({
              where: { bankId: existingAccount.bankId },
              data: { isArchived: false },
            });

            savedAccounts.push({
              success: true,
              message: 'Bank account restored successfully',
              account: updatedAccount,
            });
          } else {
            this.logger.debug(`Account already exists: ${account.account_id}`);
            savedAccounts.push({
              success: false,
              message: 'Bank account already exists and was skipped',
              account: existingAccount,
            });
          }
        } else {
          this.logger.debug(`Adding new account: ${account.account_id}`);
          const bankAccount = await this.addBankAccount(userId, {
            accountName: account.name,
            accountImage:
              institution.logo ||
              'https://www.td.com/content/dam/wealth/images/direct-investing/td-logo-en.png',
            accountAmount: account.balances.current || 0,
            accountCurrencyCode: account.balances.iso_currency_code || 'CAD',
            accountType: mapPlaidAccountType(account.type),
            isPlaidAccount: true,
            plaidAccountId: account.account_id,
            plaidAccountNumber: account.mask || '0000',
            plaidItemId: accessToken,
            plaidInstitutionId: institutionId,
            lastSyncAt: new Date(),
          });
          savedAccounts.push({
            success: true,
            message: 'Bank account added successfully',
            account: bankAccount,
          });
        }
      }
      this.logger.debug(`Fetching and processing transactions`);
      const transactionResults =
        await this.plaidService.fetchAndProcessTransactions(
          userId,
          accessToken,
        );
      this.logger.log(`Successfully added Plaid account for user ${userId}`);
      return {
        message: 'Plaid account processing completed',
        accounts: savedAccounts,
        transactions: transactionResults,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Failed to add Plaid account for user ${userId}: ${error.message}`,
        error.stack,
      );
      console.error('Error adding Plaid account:', error);
      throw new InternalServerErrorException('Failed to add Plaid account');
    }
  }
  async syncPlaidAccount(
    userId: number,
    bankId: number,
    syncType: SyncType = SyncType.USER,
  ) {
    this.logger.log(`Starting sync for account ${bankId} (User: ${userId})`);
    return this.prisma.$transaction(async (prisma) => {
      try {
        this.logger.debug(`Fetching bank account ${bankId}`);
        const bankAccount = await this.prisma.bank.findUnique({
          where: { bankId },
        });

        if (!bankAccount || bankAccount.fkUserId !== userId) {
          this.logger.warn(`Unauthorized sync attempt for account ${bankId}`);
          throw new ForbiddenException(
            'You are not allowed to sync this account',
          );
        }

        if (
          !bankAccount.isPlaidAccount ||
          !bankAccount.plaidItemId ||
          !bankAccount.plaidAccountId
        ) {
          this.logger.warn(`Invalid Plaid account ${bankId}`);
          throw new BadRequestException(
            'This is not a Plaid account or missing Plaid details',
          );
        }

        const accessToken = bankAccount.plaidItemId;
        const plaidAccountId = bankAccount.plaidAccountId;
        this.logger.debug(`Fetching latest account details`);
        const latestAccountDetails =
          await this.plaidService.getLatestAccountDetails(
            accessToken,
            plaidAccountId,
          );
        const lastSyncAt = bankAccount.lastSyncAt;
        const currentBalance = latestAccountDetails.balances.current || 0;
        const currencyCode =
          latestAccountDetails.balances.iso_currency_code || 'CAD';
        if (
          syncType === SyncType.CRON &&
          lastSyncAt &&
          bankAccount.accountAmount === currentBalance &&
          bankAccount.accountCurrencyCode === currencyCode
        ) {
          this.logger.debug(`No changes detected for account ${bankId}`);
          return bankAccount;
        }
        const user = await prisma.user.findUnique({
          where: { userId },
          select: { defaultCurrencyCode: true },
        });

        if (!user) {
          throw new NotFoundException('User not found');
        }

        const amount = currentBalance;
        this.logger.debug(`Converting currency values`);
        const [
          {
            convertedAmount: defaultCurrencyAmount,
            exchangeRate: baseCurrencyRate,
          },
          { convertedAmount: cadCurrencyAmount, exchangeRate: cadRate },
        ] = await Promise.all([
          this.currencyConversionService.convertCurrency(
            amount,
            currencyCode,
            user.defaultCurrencyCode,
          ),
          this.currencyConversionService.convertCurrency(
            amount,
            currencyCode,
            'CAD',
          ),
        ]);
        this.logger.debug(`Updating bank account ${bankId}`);

        const updatedBankAccount = await prisma.bank.update({
          where: { bankId },
          data: {
            accountAmount: amount,
            accountCurrencyCode: currencyCode,
            accountAmountInDefaultCurrency: defaultCurrencyAmount,
            exchangeRateForBaseCurrency: baseCurrencyRate,
            accountAmountInCADCurrency: cadCurrencyAmount,
            exchangeRateForCAD: cadRate,
            lastSyncAt: new Date(),
          },
        });
        await prisma.bankHistory.create({
          data: {
            bankId: updatedBankAccount.bankId,
            accountName: updatedBankAccount.accountName,
            accountType: updatedBankAccount.accountType,
            accountImage: updatedBankAccount.accountImage,
            accountAmount: updatedBankAccount.accountAmount,
            accountCurrencyCode: updatedBankAccount.accountCurrencyCode,
            accountAmountInDefaultCurrency:
              updatedBankAccount.accountAmountInDefaultCurrency,
            exchangeRateForBaseCurrency:
              updatedBankAccount.exchangeRateForBaseCurrency,
            accountAmountInCADCurrency:
              updatedBankAccount.accountAmountInCADCurrency,
            exchangeRateForCAD: updatedBankAccount.exchangeRateForCAD,
            isPlaidAccount: updatedBankAccount.isPlaidAccount,
            plaidAccountId: updatedBankAccount.plaidAccountId,
            plaidItemId: updatedBankAccount.plaidItemId,
            isArchived: updatedBankAccount.isArchived,
            fkUserId: updatedBankAccount.fkUserId,
            BankOperationType: BankOperationType.SYNC,
            lastSyncAt: new Date(),
          },
        });
        this.logger.debug(`Storing net worth history for user ${userId}`);
        await this.netWorthService.storeNetWorthHistory(userId);
        this.logger.debug(`Fetching and processing transactions`);
        const transactionResults =
          await this.plaidService.fetchAndProcessTransactions(
            userId,
            accessToken,
            lastSyncAt || undefined,
          );
        this.logger.log(
          `Successfully synced account ${bankId} for user ${userId}`,
        );
        return {
          ...updatedBankAccount,
          transactions: transactionResults,
        };
      } catch (error) {
        this.logger.error(
          `Failed to sync account ${bankId}: ${error.message}`,
          error.stack,
        );
        if (
          error instanceof NotFoundException ||
          error instanceof ForbiddenException ||
          error instanceof BadRequestException
        ) {
          throw error;
        }
        throw new InternalServerErrorException('Failed to sync Plaid account');
      }
    });
  }
  async updateBankAccount(
    id: number,
    userId: number,
    updateBankAccountDto: UpdateBankAccountDto,
  ) {
    try {
      const existingAccount = await this.prisma.bank.findUnique({
        where: { bankId: id },
      });
      if (!existingAccount || existingAccount.fkUserId !== userId) {
        throw new ForbiddenException(
          'You are not allowed to edit this account',
        );
      }
      if (
        !updateBankAccountDto ||
        Object.keys(updateBankAccountDto).length === 0
      ) {
        throw new BadRequestException('No fields to update');
      }
      const { accountAmount, accountCurrencyCode, accountType, ...rest } =
        updateBankAccountDto;

      if (accountType) {
        const currentIsCredit = existingAccount.isCreditAccount;
        const newIsCredit = accountType === 'Credit' || accountType === 'Loan';
        if (currentIsCredit && !newIsCredit) {
          throw new BadRequestException(
            'Cannot change from credit to debit account',
          );
        }
        if (!currentIsCredit && newIsCredit) {
          throw new BadRequestException(
            'Cannot change from debit to credit account',
          );
        }
      }

      const user = await this.prisma.user.findUnique({
        where: { userId },
        select: { defaultCurrencyCode: true },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      const isChangingToCredit =
        accountType &&
        (accountType === 'Credit' || accountType === 'Loan') &&
        !existingAccount.isCreditAccount;

      const isChangingFromCredit =
        accountType &&
        !(accountType === 'Credit' || accountType === 'Loan') &&
        existingAccount.isCreditAccount;
      let accountAmountInDefaultCurrency =
        existingAccount.accountAmountInDefaultCurrency;
      let accountAmountInCADCurrency =
        existingAccount.accountAmountInCADCurrency;
      let exchangeRateForBaseCurrency =
        existingAccount.exchangeRateForBaseCurrency;
      let exchangeRateForCAD = existingAccount.exchangeRateForCAD;

      if (accountAmount !== undefined || accountCurrencyCode) {
        const amountToConvert =
          accountAmount !== undefined
            ? accountAmount
            : existingAccount.accountAmount;
        const currencyToConvert =
          accountCurrencyCode || existingAccount.accountCurrencyCode;

        const [defaultCurrencyConversion, cadCurrencyConversion] =
          await Promise.all([
            this.currencyConversionService.convertCurrency(
              amountToConvert,
              currencyToConvert,
              user.defaultCurrencyCode,
            ),
            this.currencyConversionService.convertCurrency(
              amountToConvert,
              currencyToConvert,
              'CAD',
            ),
          ]);

        accountAmountInDefaultCurrency =
          defaultCurrencyConversion.convertedAmount;
        accountAmountInCADCurrency = cadCurrencyConversion.convertedAmount;
        exchangeRateForBaseCurrency = defaultCurrencyConversion.exchangeRate;
        exchangeRateForCAD = cadCurrencyConversion.exchangeRate;
      }

      const updatedBankAccount = await this.prisma.$transaction(
        async (prisma) => {
          const updateData: any = {
            ...rest,
            accountAmount:
              accountAmount !== undefined
                ? accountAmount
                : existingAccount.accountAmount,
            accountCurrencyCode:
              accountCurrencyCode || existingAccount.accountCurrencyCode,
            accountAmountInDefaultCurrency,
            accountAmountInCADCurrency,
            exchangeRateForBaseCurrency,
            exchangeRateForCAD,
          };
          if (accountType) {
            const isCreditAccount =
              accountType === 'Credit' || accountType === 'Loan';
            updateData.accountType = accountType;
            updateData.isCreditAccount = isCreditAccount;
            if (isChangingFromCredit) {
              updateData.creditAccountLiabilityInDefaultCurrency = null;
              updateData.creditAccountLiabilityInCAD = null;
            } else if (isChangingToCredit) {
              updateData.creditAccountLiabilityInDefaultCurrency = 0;
              updateData.creditAccountLiabilityInCAD = 0;
            }
          }
          const updatedAccount = await prisma.bank.update({
            where: { bankId: id },
            data: updateData,
          });

          await prisma.bankHistory.create({
            data: {
              bankId: updatedAccount.bankId,
              accountName: updatedAccount.accountName,
              accountType: updatedAccount.accountType,
              isCreditAccount: updatedAccount.isCreditAccount,
              creditAccountLiabilityInDefaultCurrency:
                updatedAccount.creditAccountLiabilityInDefaultCurrency,
              creditAccountLiabilityInCAD:
                updatedAccount.creditAccountLiabilityInCAD,
              accountImage: updatedAccount.accountImage,
              accountAmount: updatedAccount.accountAmount,
              accountCurrencyCode: updatedAccount.accountCurrencyCode,
              accountAmountInDefaultCurrency:
                updatedAccount.accountAmountInDefaultCurrency,
              exchangeRateForBaseCurrency:
                updatedAccount.exchangeRateForBaseCurrency,
              accountAmountInCADCurrency:
                updatedAccount.accountAmountInCADCurrency,
              exchangeRateForCAD: updatedAccount.exchangeRateForCAD,
              isPlaidAccount: updatedAccount.isPlaidAccount,
              plaidAccountId: updatedAccount.plaidAccountId,
              plaidItemId: updatedAccount.plaidItemId,
              isArchived: updatedAccount.isArchived,
              fkUserId: updatedAccount.fkUserId,
              BankOperationType: BankOperationType.UPDATE,
              lastSyncAt: new Date(),
            },
          });

          return updatedAccount;
        },
      );

      await this.netWorthService.storeNetWorthHistory(userId);
      return updatedBankAccount;
    } catch (error) {
      console.error('Error updating bank account:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update bank account');
    }
  }
  async deleteBankAccount(id: number, userId: number) {
    try {
      const existingAccount = await this.prisma.bank.findUnique({
        where: { bankId: id },
      });
      if (!existingAccount || existingAccount.fkUserId !== userId) {
        throw new ForbiddenException(
          'You are not allowed to delete this account',
        );
      }

      const deletedBankAccount = await this.prisma.$transaction(
        async (prisma) => {
          await prisma.bankHistory.create({
            data: {
              bankId: existingAccount.bankId,
              accountName: existingAccount.accountName,
              accountType: existingAccount.accountType,
              accountImage: existingAccount.accountImage,
              accountAmount: existingAccount.accountAmount,
              accountCurrencyCode: existingAccount.accountCurrencyCode,
              accountAmountInDefaultCurrency:
                existingAccount.accountAmountInDefaultCurrency,
              exchangeRateForBaseCurrency:
                existingAccount.exchangeRateForBaseCurrency,
              accountAmountInCADCurrency:
                existingAccount.accountAmountInCADCurrency,
              exchangeRateForCAD: existingAccount.exchangeRateForCAD,
              isPlaidAccount: existingAccount.isPlaidAccount,
              plaidAccountId: existingAccount.plaidAccountId,
              plaidItemId: existingAccount.plaidItemId,
              isArchived: existingAccount.isArchived,
              fkUserId: existingAccount.fkUserId,
              BankOperationType: BankOperationType.DELETE,
            },
          });
          return await prisma.bank.update({
            where: { bankId: id },
            data: { isArchived: true },
          });
        },
      );
      await this.netWorthService.storeNetWorthHistory(userId);
      return deletedBankAccount;
    } catch (error) {
      console.error('Error deleting bank account:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete bank account');
    }
  }

  async getBankAccountUpdateHistory(
    id: number,
    userId: number,
    bankOperationType?: BankOperationType,
  ) {
    try {
      const bankAccount = await this.prisma.bank.findUnique({
        where: { bankId: id },
      });
      if (!bankAccount || bankAccount.fkUserId !== userId) {
        throw new ForbiddenException(
          'You are not allowed to view this account',
        );
      }
      const filter: any = { bankId: id };
      if (bankOperationType) {
        filter.BankOperationType = bankOperationType;
      }
      const history = await this.prisma.bankHistory.findMany({
        where: filter,
        orderBy: { createdAt: 'desc' },
      });
      return history;
    } catch (error) {
      console.error('Error fetching bank account history:', error);
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to fetch bank account history',
      );
    }
  }
  async getUserBankAccounts(
    userId: number,
    accountCategory?: 'credit' | 'debit',
  ) {
    try {
      const whereClause: any = {
        fkUserId: userId,
        isArchived: false,
      };
      if (accountCategory) {
        if (accountCategory === 'debit') {
          whereClause.accountType = {
            in: ['Saving', 'Chequing', 'Investment', 'DEBIT'],
          };
        } else if (accountCategory === 'credit') {
          whereClause.accountType = {
            in: ['Credit', 'Loan'],
          };
        }
      }
      const bankAccounts = await this.prisma.bank.findMany({
        where: whereClause,
        include: {
          transactions: {
            orderBy: [{ updatedAt: 'desc' }],
          },
        },
      });
      return bankAccounts;
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch bank accounts');
    }
  }

  async getUserNetBankBalance(
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
      const [user, userBankAccounts] = await this.prisma.$transaction([
        this.prisma.user.findUnique({
          where: { userId },
          select: { defaultCurrencyCode: true },
        }),
        this.prisma.bank.findMany({
          where: {
            fkUserId: userId,
            isArchived: false,
            ...(timePeriod && {
              OR: [
                {
                  createdAt: {
                    gte: getStartDateByTimePeriod(timePeriod, customStartDate),
                  },
                },
                {
                  updatedAt: {
                    gte: getStartDateByTimePeriod(timePeriod, customStartDate),
                  },
                },
              ],
            }),
          },
          select: {
            isCreditAccount: true,
            accountAmount: true,
            accountAmountInDefaultCurrency: true,
            accountAmountInCADCurrency: true,
            creditAccountLiabilityInDefaultCurrency: true,
            creditAccountLiabilityInCAD: true,
            accountCurrencyCode: true,
          },
        }),
      ]);

      if (!user) {
        throw new NotFoundException('User not found');
      }
      const allSameCurrency = userBankAccounts.every((account) => {
        return account.accountCurrencyCode === user.defaultCurrencyCode;
      });

      let totalDebitInDefault = 0;
      let totalDebitInCAD = 0;
      let totalCreditLiabilityInDefault = 0;
      let totalCreditLiabilityInCAD = 0;

      userBankAccounts.forEach((account) => {
        if (account.isCreditAccount) {
          totalCreditLiabilityInDefault +=
            account.creditAccountLiabilityInDefaultCurrency || 0;
          totalCreditLiabilityInCAD += account.creditAccountLiabilityInCAD || 0;
        } else {
          if (allSameCurrency) {
            totalDebitInDefault += account.accountAmount || 0;
            totalDebitInCAD += account.accountAmountInCADCurrency || 0;
          } else {
            totalDebitInDefault += account.accountAmountInDefaultCurrency || 0;
            totalDebitInCAD += account.accountAmountInCADCurrency || 0;
          }
        }
      });
      const netBankBalanceInDefault =
        totalDebitInDefault - totalCreditLiabilityInDefault;
      const netBankBalanceInCAD = totalDebitInCAD - totalCreditLiabilityInCAD;
      return {
        totalBankAmountInCAD: Number(netBankBalanceInCAD.toFixed(3)),
        totalBankAmountCurrency: 'CAD',
        totalBankAmountInDefaultCurrency: Number(
          netBankBalanceInDefault.toFixed(3),
        ),
        defaultCurrency: user.defaultCurrencyCode,
        timePeriod: timePeriod || 'all',
      };
    } catch (error) {
      console.error('Error retrieving user net bank balance:', error);
      throw new InternalServerErrorException(
        'Failed to retrieve net bank balance',
      );
    }
  }
  async getUserNetWorth(
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
      const [user, netAssets, netLiabilities] = await Promise.all([
        this.prisma.user.findUnique({
          where: { userId },
          select: { defaultCurrencyCode: true },
        }),
        this.financialItemsService.getUserNetAssets(
          userId,
          timePeriod,
          customStartDate,
        ),
        this.financialItemsService.getUserNetLiabilities(
          userId,
          timePeriod,
          customStartDate,
        ),
      ]);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const totalAmountInCAD =
        netAssets.totalAmountInCAD - netLiabilities.totalAmountInCAD;

      const totalAmountInDefaultCurrency =
        netAssets.totalAmountInDefaultCurrency -
        netLiabilities.totalAmountInDefaultCurrency;

      const roundedTotalAmountInCAD = Number(totalAmountInCAD.toFixed(3));
      const roundedTotalAmountInDefaultCurrency = Number(
        totalAmountInDefaultCurrency.toFixed(3),
      );
      return {
        totalAmountInCAD: roundedTotalAmountInCAD,
        totalAmountCurrency: 'CAD',
        totalAmountInDefaultCurrency: roundedTotalAmountInDefaultCurrency,
        defaultCurrency: user.defaultCurrencyCode,
        timePeriod: timePeriod || 'all',
        components: {
          assets: netAssets,
          liabilities: netLiabilities,
        },
      };
    } catch (error) {
      console.error('Error retrieving user net worth:', error);
      throw new InternalServerErrorException('Failed to retrieve net worth');
    }
  }
  async getNetWorthHistory(
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
      const historicalData = await this.prisma.netWorthHistory.findMany({
        where: {
          fkUserId: userId,
          ...(timePeriod && { createdAt: { gte: startDate } }),
        },
        orderBy: { createdAt: 'asc' },
      });
      if (historicalData.length === 0) {
        return 'You Dont Have Networth History';
      }
      if (timePeriod === 'weekly') {
        const now = new Date();
        const todayUTC = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
        );
        const startDate = new Date(todayUTC);
        startDate.setUTCDate(todayUTC.getUTCDate() - 6);
        startDate.setUTCHours(0, 0, 0, 0);
        const endDate = new Date(todayUTC);
        endDate.setUTCHours(23, 59, 59, 999);
        const beforePeriodRecord = await this.prisma.netWorthHistory.findFirst({
          where: {
            fkUserId: userId,
            createdAt: { lt: startDate },
          },
          orderBy: { createdAt: 'desc' },
        });
        const weeklyData = await this.prisma.netWorthHistory.findMany({
          where: {
            fkUserId: userId,
            createdAt: { gte: startDate, lte: endDate },
          },
          orderBy: { createdAt: 'asc' },
        });
        const daysOfWeek: {
          date: string;
          day: string;
          netWorthInCAD: number;
          netWorthInDefaultCurrency: number;
          defaultCurrency: string;
        }[] = [];
        let currentDate = new Date(startDate);
        let lastKnownValues = {
          cad: beforePeriodRecord?.netWorthInCAD || 0,
          default: beforePeriodRecord?.netWorthInDefaultCurrency || 0,
          currency:
            beforePeriodRecord?.defaultCurrency || user.defaultCurrencyCode,
        };
        while (currentDate <= endDate) {
          const dateKey = currentDate.toISOString().split('T')[0];
          const dayName = currentDate.toLocaleDateString('en-US', {
            weekday: 'long',
          });
          const dayRecords = weeklyData.filter(
            (record) =>
              new Date(record.createdAt).toISOString().split('T')[0] ===
              dateKey,
          );
          if (dayRecords.length > 0) {
            const lastRecord = dayRecords[dayRecords.length - 1];
            lastKnownValues = {
              cad: lastRecord.netWorthInCAD,
              default: lastRecord.netWorthInDefaultCurrency,
              currency: lastRecord.defaultCurrency,
            };
            daysOfWeek.push({
              date: dateKey,
              day: dayName,
              netWorthInCAD: lastRecord.netWorthInCAD,
              netWorthInDefaultCurrency: lastRecord.netWorthInDefaultCurrency,
              defaultCurrency: lastRecord.defaultCurrency,
            });
          } else {
            daysOfWeek.push({
              date: dateKey,
              day: dayName,
              netWorthInCAD: lastKnownValues.cad,
              netWorthInDefaultCurrency: lastKnownValues.default,
              defaultCurrency: lastKnownValues.currency,
            });
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
        return {
          netWorthHistory: daysOfWeek,
          timePeriod: 'weekly',
          weekRange: {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
          },
        };
      }
      const formattedData = historicalData.map((entry) => {
        const dateObj = new Date(entry.createdAt);
        return {
          date: dateObj.toISOString().split('T')[0],
          time: dateObj.toTimeString().split(' ')[0],
          netWorthInCAD: entry.netWorthInCAD,
          netWorthInDefaultCurrency: entry.netWorthInDefaultCurrency,
          defaultCurrency: entry.defaultCurrency,
          timePeriod: timePeriod || 'all',
        };
      });
      return {
        netWorthHistory: formattedData,
      };
    } catch (error) {
      console.error('Error retrieving net worth history:', error);
      throw new InternalServerErrorException(
        'Failed to retrieve net worth history',
      );
    }
  }
  async updateBankAccountBalance(
    bankAccountId: number,
    amount: number,
    transactionCurrencyCode: string,
    operationType: 'ADD' | 'DEDUCT',
    userId: number,
    bankOperationType: BankOperationType = BankOperationType.UPDATE,
  ) {
    try {
      const [bankAccount, user] = await Promise.all([
        this.prisma.bank.findUnique({
          where: { bankId: bankAccountId },
        }),
        this.prisma.user.findUnique({
          where: { userId },
          select: { defaultCurrencyCode: true },
        }),
      ]);
      if (!bankAccount) {
        throw new NotFoundException('Bank account not found');
      }
      if (!user) {
        throw new NotFoundException(`User ${userId} not found`);
      }
      const conversions = await Promise.all([
        transactionCurrencyCode === bankAccount.accountCurrencyCode
          ? {
              convertedAmount: amount,
              exchangeRate: 1,
            }
          : this.currencyConversionService.convertCurrency(
              amount,
              transactionCurrencyCode,
              bankAccount.accountCurrencyCode,
            ),
        transactionCurrencyCode === user.defaultCurrencyCode
          ? {
              convertedAmount: amount,
              exchangeRate: 1,
            }
          : this.currencyConversionService.convertCurrency(
              amount,
              transactionCurrencyCode,
              user.defaultCurrencyCode,
            ),
        transactionCurrencyCode === 'CAD'
          ? {
              convertedAmount: amount,
            }
          : this.currencyConversionService.convertCurrency(
              amount,
              transactionCurrencyCode,
              'CAD',
            ),
      ]);
      const [
        { convertedAmount: amountInAccountCurrency },
        { convertedAmount: amountInDefaultCurrency },
        { convertedAmount: amountInCAD },
      ] = conversions;
      return await this.prisma.$transaction(async (prisma) => {
        const updateData: any = {
          accountAmount:
            operationType === 'ADD'
              ? bankAccount.accountAmount + amountInAccountCurrency
              : bankAccount.accountAmount - amountInAccountCurrency,
          accountAmountInDefaultCurrency:
            operationType === 'ADD'
              ? (bankAccount.accountAmountInDefaultCurrency || 0) +
                amountInDefaultCurrency
              : (bankAccount.accountAmountInDefaultCurrency || 0) -
                amountInDefaultCurrency,
          accountAmountInCADCurrency:
            operationType === 'ADD'
              ? (bankAccount.accountAmountInCADCurrency || 0) + amountInCAD
              : (bankAccount.accountAmountInCADCurrency || 0) - amountInCAD,
          updatedAt: new Date(),
        };
        if (
          bankAccount.isCreditAccount &&
          bankOperationType === BankOperationType.EXPENSE
        ) {
          updateData.creditAccountLiabilityInDefaultCurrency =
            operationType === 'DEDUCT'
              ? (bankAccount.creditAccountLiabilityInDefaultCurrency || 0) +
                amountInDefaultCurrency
              : (bankAccount.creditAccountLiabilityInDefaultCurrency || 0) -
                amountInDefaultCurrency;

          updateData.creditAccountLiabilityInCAD =
            operationType === 'DEDUCT'
              ? (bankAccount.creditAccountLiabilityInCAD || 0) + amountInCAD
              : (bankAccount.creditAccountLiabilityInCAD || 0) - amountInCAD;
        }

        const updatedAccount = await prisma.bank.update({
          where: { bankId: bankAccountId },
          data: updateData,
        });
        await prisma.bankHistory.create({
          data: {
            bankId: updatedAccount.bankId,
            accountName: updatedAccount.accountName,
            accountType: updatedAccount.accountType,
            accountImage: updatedAccount.accountImage,
            accountAmount: updatedAccount.accountAmount,
            accountCurrencyCode: updatedAccount.accountCurrencyCode,
            accountAmountInDefaultCurrency:
              updatedAccount.accountAmountInDefaultCurrency,
            exchangeRateForBaseCurrency:
              updatedAccount.exchangeRateForBaseCurrency,
            accountAmountInCADCurrency:
              updatedAccount.accountAmountInCADCurrency,
            exchangeRateForCAD: updatedAccount.exchangeRateForCAD,
            isPlaidAccount: updatedAccount.isPlaidAccount,
            plaidAccountId: updatedAccount.plaidAccountId,
            plaidItemId: updatedAccount.plaidItemId,
            plaidInstitutionId: updatedAccount.plaidInstitutionId,
            isArchived: updatedAccount.isArchived,
            fkUserId: updatedAccount.fkUserId,
            BankOperationType: bankOperationType,
            creditAccountLiabilityInDefaultCurrency:
              updatedAccount.creditAccountLiabilityInDefaultCurrency,
            creditAccountLiabilityInCAD:
              updatedAccount.creditAccountLiabilityInCAD,
            lastSyncAt: new Date(),
          },
        });
        return updatedAccount;
      });
    } catch (error) {
      throw error;
    }
  }

  async getAllBankNames() {
    try {
      const cacheKey = 'banks';
      const cachedData = this.cacheService.get(cacheKey);

      if (cachedData) {
        console.log('✅ Returning cached bank data');
        return cachedData;
      }
      const response = await axios.post(
        `${this.configService.get<string>('PLAID_BASE_URL')}/institutions/get`,
        {
          client_id: this.configService.get<string>('PLAID_CLIENT_ID'),
          secret: this.configService.get<string>('PLAID_SECRET'),
          country_codes: ['CA'],
          count: 500,
          offset: 0,
          options: { include_optional_metadata: true },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      const institutionsWithLogo = response.data.institutions.map(
        (institution) => ({
          name: institution.name,
          logo: institution.logo,
          institution_id: institution.institution_id,
          primary_color: institution.primary_color,
          routing_numbers: institution.routing_numbers,
          bank_url: institution.url,
        }),
      );
      this.cacheService.set(cacheKey, institutionsWithLogo, 21600);
      console.log('🆕 Fetched from API and cached');
      return institutionsWithLogo;
    } catch (error) {
      console.error(
        'Error fetching banks from Plaid:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to fetch bank data from Plaid');
    }
  }

  async getAllAccountTypes() {
    const cacheKey = 'accountTypes';
    const cachedData = await this.cacheService.get(cacheKey);
    if (cachedData) {
      console.log('✅ Returning cached account types');
      return cachedData;
    }
    const accountTypes = Object.values(AccountType);
    await this.cacheService.set(cacheKey, accountTypes, 86400);
    return accountTypes;
  }
  async getCurrencyList() {
    const cacheKey = 'currencyList';
    const cachedData = await this.cacheService.get(cacheKey);
    if (cachedData) {
      console.log('✅ Returning cached currency list');
      return cachedData;
    }
    const fiatCurrencyList = currencyList.filter(
      (currency) =>
        currency.countryCode !== 'Crypto' && currency.status !== 'DEPRECIATED',
    );
    await this.cacheService.set(cacheKey, fiatCurrencyList, 86400);
    return fiatCurrencyList;
  }
}
