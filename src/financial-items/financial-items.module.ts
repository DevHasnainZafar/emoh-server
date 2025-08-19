import { Module } from '@nestjs/common';
import { FinancialItemsController } from './financial-items.controller';
import { FinancialItemsService } from './financial-items.service';

@Module({
  controllers: [FinancialItemsController],
  providers: [FinancialItemsService],
  exports: [FinancialItemsService],
})
export class FinancialItemsModule {}
