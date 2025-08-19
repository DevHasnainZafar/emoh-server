import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ApiResponse } from 'src/common/dtos/api-response.dto';
import { EditTransactionDto } from './dtos/edit-transaction.dto';
import { ENDPOINTS } from 'src/constants/Endpoints';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getUserTransactions(
    @Req() req,
    @Query('transactionType') transactionType?: 'INCOME' | 'EXPENSE',
    @Query('isPlaidTransaction') isPlaidTransaction?: boolean,
    @Query('isUncategorized') isUncategorized?: boolean,
      @Query('fkBankId')
    fkBankId?: number,
    @Query('timePeriod')
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
    @Query('customStartDate') customStartDate?: string,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Invalid user authentication');
    }
    const parsedCustomStartDate = customStartDate
      ? new Date(customStartDate)
      : undefined;
    const transactions = await this.transactionsService.getUserTransactions(
      userId,
      transactionType,
      isPlaidTransaction,
      isUncategorized,
      timePeriod,
      parsedCustomStartDate,
      fkBankId,
    );
    return new ApiResponse(
      200,
      "User's transactions retrieved successfully",
      transactions,
    );
  }

  @Patch(ENDPOINTS.TRANSACTION.EDIT_TRANSACTION)
  @UseGuards(JwtAuthGuard)
  async editTransaction(
    @Req() req,
    @Param('transactionId') transactionId: string,
    @Body() editTransactionDto: EditTransactionDto,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Invalid user authentication');
    }
    const updatedTransaction = await this.transactionsService.editTransaction(
      userId,
      transactionId,
      editTransactionDto,
    );
    return new ApiResponse(
      200,
      'Transaction updated successfully',
      updatedTransaction,
    );
  }

  @Delete(ENDPOINTS.TRANSACTION.DELETE_TRANSACTION)
  @UseGuards(JwtAuthGuard)
  async deleteTransaction(
    @Req() req,
    @Param('transactionId') transactionId: string,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Invalid user authentication');
    }
    const result = await this.transactionsService.deleteTransaction(
      userId,
      transactionId,
    );
    return new ApiResponse(200, 'Transaction deleted successfully', null);
  }
}
