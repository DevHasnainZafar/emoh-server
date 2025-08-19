import { Global, Module } from '@nestjs/common';
import { CacheService } from '../services/cache.service';
import { CurrencyConversionService } from '../services/currencyConversion.service';
import { NetWorthService } from '../services/net-worth.service';
import { OpenAIService } from '../services/openai.service';
import { RecurringTasksService } from '../services/recurring-tasks.service';
import { FinancialItemsService } from 'src/financial-items/financial-items.service';
import { ConfigService } from '@nestjs/config';
import { BankService } from 'src/bank/bank.service';
import { PlaidService } from 'src/plaid/plaid.service';
import { TransactionsService } from 'src/transactions/transactions.service';

@Global()
@Module({
  providers: [
    CacheService,
    CurrencyConversionService,
    NetWorthService,
    OpenAIService,
    RecurringTasksService,
    FinancialItemsService,
    ConfigService,
    BankService,
    PlaidService,
    TransactionsService,
  ],
  exports: [
    CacheService,
    CurrencyConversionService,
    NetWorthService,
    OpenAIService,
    RecurringTasksService,
    ConfigService,
    TransactionsService,
    FinancialItemsService,
    PlaidService,
    BankService
  ],
})
export class CommonModule {}
