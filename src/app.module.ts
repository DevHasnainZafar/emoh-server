import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MulterModule } from '@nestjs/platform-express';
import { TokenMiddleware } from './common/middleware/token.middleware';
import { BankModule } from './bank/bank.module';
import { IncomeModule } from './income/income.module';
import { BudgetModule } from './budget/budget.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ExpenseModule } from './expense/expense.module';
import { PlaidModule } from './plaid/plaid.module';
import { FinancialItemsModule } from './financial-items/financial-items.module';
import { AdminModule } from './admin/admin.module';
import { HealthController } from './health/health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { TransactionsModule } from './transactions/transactions.module';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/modules/common.module';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot(),
    AuthModule,
   ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 20,
        },
      ],
    }),
    MulterModule.register({
      dest: './uploads',
    }),
    ScheduleModule.forRoot(),
    BankModule,
    IncomeModule,
    BudgetModule,
    ExpenseModule,
    PlaidModule,
    FinancialItemsModule,
    AdminModule,
    TerminusModule,
    TransactionsModule,
    PrismaModule,
    CommonModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService,{
    provide:APP_GUARD,
    useClass:ThrottlerGuard
  }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TokenMiddleware)
      .exclude({ path: 'health', method: RequestMethod.GET })
      .forRoutes('*');
  }
}
