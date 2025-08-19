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
import { CreateFinancialItemDto } from './dtos/create-financial-item.dto';
import { CurrencyConversionService } from 'src/common/services/currencyConversion.service';
import { NetWorthService } from 'src/common/services/net-worth.service';
import { FinancialItemResponse } from './dtos/financial-item-response.dto';
import { UpdateFinancialItemDto } from './dtos/update-financial-item.dto';
import { getStartDateByTimePeriod } from 'src/utils/dateFilter.util';
import { categorizeBankAccount } from 'src/utils/accountCategorizer.util';
import { ItemType } from '@prisma/client';

@Injectable()
export class FinancialItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyConversionService: CurrencyConversionService,
    @Inject(forwardRef(() => NetWorthService))
    private readonly netWorthService: NetWorthService,
  ) {}

  async addFinancialItem(
    userId: number,
    createFinancialItemDto: CreateFinancialItemDto,
  ): Promise<FinancialItemResponse> {
    try {
      const {
        itemName,
        itemType,
        givenAmount,
        givenCurrencyCode = 'CAD',
      } = createFinancialItemDto;

      const user = await this.prisma.user.findUnique({
        where: { userId },
        select: { defaultCurrencyCode: true },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      const validCurrencyCodeRegex = /^[A-Z]{3}$/;
      if (!validCurrencyCodeRegex.test(user.defaultCurrencyCode)) {
        throw new BadRequestException(
          `Invalid currency format: ${user.defaultCurrencyCode}. Expected a 3-letter currency code.`,
        );
      }
      const [
        {
          convertedAmount: defaultCurrencyAmount,
          exchangeRate: baseCurrencyRate,
        },
        { convertedAmount: cadCurrencyAmount, exchangeRate: cadRate },
      ] = await Promise.all([
        this.currencyConversionService.convertCurrency(
          givenAmount,
          givenCurrencyCode,
          user.defaultCurrencyCode,
        ),
        this.currencyConversionService.convertCurrency(
          givenAmount,
          givenCurrencyCode,
          'CAD',
        ),
      ]);
      const financialItem = await this.prisma.financialItems.create({
        data: {
          itemName,
          itemType,
          givenAmount,
          givenCurrencyCode,
          amountInDefaultCurrency: defaultCurrencyAmount,
          defaultCurrency: user.defaultCurrencyCode,
          exchangeRateForBaseCurrency: baseCurrencyRate,
          amountInCADCurrency: cadCurrencyAmount,
          exchangeRateForCAD: cadRate,
          fkUserId: userId,
        },
      });
      await this.netWorthService.storeNetWorthHistory(userId);

      return {
        ...financialItem,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('Error adding financial item:', error);
      throw new InternalServerErrorException('Failed to create financial item');
    }
  }
  async updateFinancialItem(
    id: number,
    userId: number,
    updateFinancialItemDto: UpdateFinancialItemDto,
  ): Promise<FinancialItemResponse> {
    try {
      const existingItem = await this.prisma.financialItems.findUnique({
        where: { itemId: id },
      });

      if (!existingItem || existingItem.fkUserId !== userId) {
        throw new ForbiddenException('You are not allowed to edit this item');
      }

      if (
        !updateFinancialItemDto ||
        Object.keys(updateFinancialItemDto).length === 0
      ) {
        throw new BadRequestException('No fields to update');
      }

      const { givenAmount, givenCurrencyCode, ...rest } =
        updateFinancialItemDto;
      const user = await this.prisma.user.findUnique({
        where: { userId },
        select: { defaultCurrencyCode: true },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      let amountInDefaultCurrency = existingItem.amountInDefaultCurrency;
      let amountInCADCurrency = existingItem.amountInCADCurrency;
      let exchangeRateForBaseCurrency =
        existingItem.exchangeRateForBaseCurrency;
      let exchangeRateForCAD = existingItem.exchangeRateForCAD;

      if (givenAmount && givenCurrencyCode) {
        const [
          {
            convertedAmount: newAmountInDefaultCurrency,
            exchangeRate: newExchangeRateForBaseCurrency,
          },
          {
            convertedAmount: newAmountInCADCurrency,
            exchangeRate: newExchangeRateForCAD,
          },
        ] = await Promise.all([
          this.currencyConversionService.convertCurrency(
            givenAmount,
            givenCurrencyCode,
            user.defaultCurrencyCode,
          ),
          this.currencyConversionService.convertCurrency(
            givenAmount,
            givenCurrencyCode,
            'CAD',
          ),
        ]);

        amountInDefaultCurrency = newAmountInDefaultCurrency;
        amountInCADCurrency = newAmountInCADCurrency;
        exchangeRateForBaseCurrency = newExchangeRateForBaseCurrency;
        exchangeRateForCAD = newExchangeRateForCAD;
      }

      const updatedItem = await this.prisma.financialItems.update({
        where: { itemId: id },
        data: {
          ...rest,
          givenAmount,
          givenCurrencyCode,
          amountInDefaultCurrency,
          amountInCADCurrency,
          exchangeRateForBaseCurrency,
          exchangeRateForCAD,
        },
      });

      await this.netWorthService.storeNetWorthHistory(userId);
      return updatedItem;
    } catch (error) {
      console.error('Error updating financial item:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update financial item');
    }
  }

  async deleteFinancialItem(id: number, userId: number): Promise<void> {
    try {
      const existingItem = await this.prisma.financialItems.findUnique({
        where: { itemId: id },
      });

      if (!existingItem || existingItem.fkUserId !== userId) {
        throw new ForbiddenException('You are not allowed to delete this item');
      }

      await this.prisma.financialItems.update({
        where: { itemId: id },
        data: { isDeleted: true },
      });

      await this.netWorthService.storeNetWorthHistory(userId);
    } catch (error) {
      console.error('Error deleting financial item:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete financial item');
    }
  }
  async getUserFinancialItems(
    userId: number,
    itemType?: ItemType,
  ): Promise<FinancialItemResponse[]> {
    try {
      const financialItems = await this.prisma.financialItems.findMany({
        where: {
          fkUserId: userId,
          isDeleted: false,
          ...(itemType && { itemType }),
        },
      });
      const bankAccounts = await this.prisma.bank.findMany({
        where: {
          fkUserId: userId,
          isArchived: false,
          ...(itemType && {
            isCreditAccount: itemType === ItemType.Liability,
          }),
        },
      });
      const bankAccountItems = bankAccounts.map((account) => ({
        itemId: account.bankId,
        itemName: account.accountName,
        itemType: account.isCreditAccount ? ItemType.Liability : ItemType.Asset,
        givenAmount: account.isCreditAccount
          ? account.creditAccountLiabilityInDefaultCurrency || 0
          : account.accountAmount,
        givenCurrencyCode: account.accountCurrencyCode,
        amountInDefaultCurrency: account.isCreditAccount
          ? account.creditAccountLiabilityInDefaultCurrency || 0
          : account.accountAmountInDefaultCurrency,
        amountInCADCurrency: account.isCreditAccount
          ? account.creditAccountLiabilityInCAD || 0
          : account.accountAmountInCADCurrency,
        isBankAccount: true,
        isBankCreditAccount: account.isCreditAccount,
        creditLiabilityInCad: account.creditAccountLiabilityInCAD,
        creditAccountLiabilityInDefaultCurrency:
          account.creditAccountLiabilityInDefaultCurrency,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      }));
      const allItems = [...financialItems, ...bankAccountItems];
      if (allItems.length === 0) {
        throw new NotFoundException('No financial items found');
      }
      return allItems;
    } catch (error) {
      console.error('Error fetching financial items:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch financial items');
    }
  }

  async getUserNetAssets(
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
      const financialAssets = await this.prisma.financialItems.findMany({
        where: {
          fkUserId: userId,
          isDeleted: false,
          itemType: 'Asset',
          ...(timePeriod && {
            OR: [
              { createdAt: { gte: startDate } },
              { updatedAt: { gte: startDate } },
            ],
          }),
        },
        select: {
          amountInCADCurrency: true,
          givenAmount: true,
          givenCurrencyCode: true,
        },
      });
      const bankAccounts = await this.prisma.bank.findMany({
        where: {
          fkUserId: userId,
          isArchived: false,
          ...(timePeriod && {
            OR: [
              { createdAt: { gte: startDate } },
              { updatedAt: { gte: startDate } },
            ],
          }),
        },
      });

      const bankAssets = bankAccounts
        .filter(
          (account) => categorizeBankAccount(account.accountType) === 'Asset',
        )
        .map((account) => ({
          amountInCADCurrency: account.accountAmountInCADCurrency,
          givenAmount: account.accountAmount,
          givenCurrencyCode: account.accountCurrencyCode,
        }));
      const allAssets = [...financialAssets, ...bankAssets];

      const totalAssetsInCAD = allAssets.reduce(
        (total, asset) => total + (asset.amountInCADCurrency || 0),
        0,
      );

      const allSameCurrency = allAssets.every((asset) => {
        return asset.givenCurrencyCode === user.defaultCurrencyCode;
      });

      let totalAssetsInDefaultCurrency: number;

      if (allSameCurrency && allAssets.length > 0) {
        totalAssetsInDefaultCurrency = allAssets.reduce(
          (total, asset) => total + (asset.givenAmount || 0),
          0,
        );
      } else {
        const { convertedAmount } =
          await this.currencyConversionService.convertCurrency(
            totalAssetsInCAD,
            'CAD',
            user.defaultCurrencyCode,
          );
        totalAssetsInDefaultCurrency = convertedAmount;
      }

      return {
        totalAmountInCAD: Number(totalAssetsInCAD.toFixed(3)),
        totalAmountCurrency: 'CAD',
        totalAmountInDefaultCurrency: Number(
          totalAssetsInDefaultCurrency.toFixed(3),
        ),
        defaultCurrency: user.defaultCurrencyCode,
        timePeriod: timePeriod || 'all',
        itemCount: allAssets.length,
      };
    } catch (error) {
      console.error('Error calculating net assets:', error);
      throw new InternalServerErrorException('Failed to calculate net assets');
    }
  }

  async getUserNetLiabilities(
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
      const financialLiabilities = await this.prisma.financialItems.findMany({
        where: {
          fkUserId: userId,
          isDeleted: false,
          itemType: 'Liability',
          ...(timePeriod && {
            OR: [
              { createdAt: { gte: startDate } },
              { updatedAt: { gte: startDate } },
            ],
          }),
        },
        select: {
          amountInCADCurrency: true,
          givenAmount: true,
          givenCurrencyCode: true,
        },
      });
      const bankAccounts = await this.prisma.bank.findMany({
        where: {
          fkUserId: userId,
          isArchived: false,
          isCreditAccount: true,
          ...(timePeriod && {
            OR: [
              { createdAt: { gte: startDate } },
              { updatedAt: { gte: startDate } },
            ],
          }),
        },
        select: {
          creditAccountLiabilityInDefaultCurrency: true,
          creditAccountLiabilityInCAD: true,
          accountCurrencyCode: true,
        },
      });

      const bankLiabilities = bankAccounts.map((account) => ({
        amountInCADCurrency: account.creditAccountLiabilityInCAD || 0,
        givenAmount: account.creditAccountLiabilityInDefaultCurrency || 0,
        givenCurrencyCode: user.defaultCurrencyCode,
      }));
      const allLiabilities = [...financialLiabilities, ...bankLiabilities];

      const totalLiabilitiesInCAD = allLiabilities.reduce(
        (total, liability) => total + (liability.amountInCADCurrency || 0),
        0,
      );

      const allSameCurrency = allLiabilities.every((liability) => {
        return liability.givenCurrencyCode === user.defaultCurrencyCode;
      });

      let totalLiabilitiesInDefaultCurrency: number;

      if (allSameCurrency && allLiabilities.length > 0) {
        totalLiabilitiesInDefaultCurrency = allLiabilities.reduce(
          (total, liability) => total + (liability.givenAmount || 0),
          0,
        );
      } else {
        const { convertedAmount } =
          await this.currencyConversionService.convertCurrency(
            totalLiabilitiesInCAD,
            'CAD',
            user.defaultCurrencyCode,
          );
        totalLiabilitiesInDefaultCurrency = convertedAmount;
      }
      return {
        totalAmountInCAD: Number(totalLiabilitiesInCAD.toFixed(3)),
        totalAmountCurrency: 'CAD',
        totalAmountInDefaultCurrency: Number(
          totalLiabilitiesInDefaultCurrency.toFixed(3),
        ),
        defaultCurrency: user.defaultCurrencyCode,
        timePeriod: timePeriod || 'all',
        itemCount: allLiabilities.length,
      };
    } catch (error) {
      console.error('Error calculating net liabilities:', error);
      throw new InternalServerErrorException(
        'Failed to calculate net liabilities',
      );
    }
  }
}
