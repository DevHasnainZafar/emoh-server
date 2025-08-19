import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FinancialItemsService } from 'src/financial-items/financial-items.service';

@Injectable()
export class NetWorthService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => FinancialItemsService))
    private financialItemsService: FinancialItemsService,
  ) {}

  async calculateNetWorth(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: { defaultCurrencyCode: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [netAssets, netLiabilities] = await Promise.all([
      this.financialItemsService.getUserNetAssets(userId),
      this.financialItemsService.getUserNetLiabilities(userId),
    ]);
    const netWorthInCAD =
      netAssets.totalAmountInCAD - netLiabilities.totalAmountInCAD;

    const netWorthInDefaultCurrency =
      netAssets.totalAmountInDefaultCurrency -
      netLiabilities.totalAmountInDefaultCurrency;
    return {
      netWorthInCAD,
      netWorthInDefaultCurrency,
      defaultCurrency: user.defaultCurrencyCode,
      components: {
        assets: netAssets,
        liabilities: netLiabilities,
      },
    };
  }

  async storeNetWorthHistory(userId: number) {
    const { netWorthInCAD, netWorthInDefaultCurrency, defaultCurrency } =
      await this.calculateNetWorth(userId);
    await this.prisma.netWorthHistory.create({
      data: {
        fkUserId: userId,
        netWorthInCAD,
        netWorthInDefaultCurrency,
        defaultCurrency,
      },
    });
  }
}
