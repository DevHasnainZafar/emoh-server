import { Injectable } from '@nestjs/common';
import { categories } from './utils/categories';
import { PrismaService } from './prisma/prisma.service';
import { CacheService } from './common/services/cache.service';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}
  getHello(): string {
    return 'Hello World!';
  }

  async getCategories(userId: number) {
    const cacheKey = `user:${userId}:categories`;
    const cachedData = await this.cacheService.get(cacheKey);
    const [incomeCats, expenseCats, budgetCats] = await Promise.all([
      this.prisma.income.findMany({
        where: { fkUserId: userId },
        select: { categoryName: true },
        distinct: ['categoryName'],
      }),
      this.prisma.expense.findMany({
        where: { fkUserId: userId },
        select: { paidToCategory: true },
        distinct: ['paidToCategory'],
      }),
      this.prisma.budget.findMany({
        where: { fkUserId: userId },
        select: { categoryName: true },
        distinct: ['categoryName'],
      }),
    ]);
    const usedCategories = [
      ...incomeCats.map((c) => c.categoryName),
      ...expenseCats.map((c) => c.paidToCategory),
      ...budgetCats.map((c) => c.categoryName),
    ].filter(Boolean);
    const baseCategoryNames = categories.map((c) => c.category);
    const customCategoryNames = Array.from(
      new Set(usedCategories.filter((c) => !baseCategoryNames.includes(c))),
    );
    const customCategories = customCategoryNames.map((category) => ({
      category,
      type: 'custom',
    }));
    const finalCategories = [...customCategories, ...categories];
    await this.cacheService.set(cacheKey, finalCategories, 80);
    return finalCategories;
  }
}
