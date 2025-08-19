import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { BankService } from './bank.service';
import { ENDPOINTS, SyncType } from 'src/constants/Endpoints';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateBankAccountDto } from './dtos/create-bank-account.dto';
import { ApiResponse } from 'src/common/dtos/api-response.dto';
import { UpdateBankAccountDto } from './dtos/update-bank-account.dto';
import { BankOperationType } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiSecurity,
} from '@nestjs/swagger';
import { AddPlaidAccountDto } from './dtos/add-plaid-account.dto';

@ApiTags('Banks')
@ApiSecurity('auth-token')
@Controller('banks')
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Post(ENDPOINTS.BANK.ADD_ACCOUNT)
  @UseGuards(JwtAuthGuard)
  @UsePipes(ValidationPipe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a bank account' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Account added successfully',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiBody({ type: CreateBankAccountDto })
  async addBankAccont(
    @Body() createBankAccountDto: CreateBankAccountDto,
    @Req() req,
  ) {
    const userId = req.user.userId;
    const bankAccount = await this.bankService.addBankAccount(
      userId,
      createBankAccountDto,
    );
    return new ApiResponse(200, 'Account added successfully', bankAccount);
  }
  @Post(ENDPOINTS.BANK.ADD_PLAID_ACCOUNT)
  @UseGuards(JwtAuthGuard)
  @UsePipes(ValidationPipe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a bank account via Plaid' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Bank account added successfully',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiBody({ type: AddPlaidAccountDto })
  async addPlaidAccount(
    @Body() addPlaidAccountDto: AddPlaidAccountDto,
    @Req() req,
  ) {
    const userId = req.user.userId;
    const result = await this.bankService.addPlaidAccount(
      userId,
      addPlaidAccountDto,
    );
    return new ApiResponse(200, result.message, result);
  }
  @Patch(ENDPOINTS.BANK.EDIT_ACCOUNT)
  @UseGuards(JwtAuthGuard)
  @UsePipes(ValidationPipe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a bank account' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Bank account updated successfully',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiParam({ name: 'id', type: Number, description: 'Bank account ID' })
  @ApiBody({ type: UpdateBankAccountDto })
  async updateBankAccount(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBankAccountDto: UpdateBankAccountDto,
    @Req() req,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Invalid user authentication');
    }
    const updatedBankAccount = await this.bankService.updateBankAccount(
      id,
      userId,
      updateBankAccountDto,
    );
    return new ApiResponse(
      200,
      'Account updated successfully',
      updatedBankAccount,
    );
  }

  @Post(ENDPOINTS.BANK.SYNC_PLAID_ACCOUNT)
  @UseGuards(JwtAuthGuard)
  @UsePipes(ValidationPipe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync a Plaid bank account' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Plaid bank account synced successfully',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden' })
  @SwaggerApiResponse({ status: 404, description: 'Not Found' })
  @SwaggerApiResponse({ status: 500, description: 'Internal Server Error' })
  @ApiParam({ name: 'bankId', type: Number, description: 'Bank account ID' })
  async syncPlaidAccount(
    @Param('bankId', ParseIntPipe) bankId: number,
    @Req() req,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Invalid user authentication');
    }
    const syncedBankAccount = await this.bankService.syncPlaidAccount(
      userId,
      bankId,
      SyncType.USER,
    );
    return new ApiResponse(
      200,
      'Account synced successfully',
      syncedBankAccount,
    );
  }

  @Get(ENDPOINTS.BANK.GET_BANK_HISTORY)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get bank account update history' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Bank update history fetched successfully',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiParam({ name: 'id', type: Number, description: 'Bank account ID' })
  @ApiQuery({
    name: 'bankOperationType',
    enum: BankOperationType,
    required: false,
  })
  async getBankAccountUpdateHistory(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
    @Query('bankOperationType') bankOperationType?: BankOperationType,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Invalid user authentication');
    }
    const updateHistory = await this.bankService.getBankAccountUpdateHistory(
      id,
      userId,
      bankOperationType,
    );
    return new ApiResponse(200, 'Bank Update History Fetched', updateHistory);
  }

  @Delete(ENDPOINTS.BANK.DELETE_ACCOUNT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a bank account' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Bank account deleted successfully',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiParam({ name: 'id', type: Number, description: 'Bank account ID' })
  async deleteBankAccount(@Param('id', ParseIntPipe) id: number, @Req() req) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Invalid user authentication');
    }
    await this.bankService.deleteBankAccount(id, userId);
    return new ApiResponse(200, 'Account deleted successfully', null);
  }

  @Get(ENDPOINTS.BANK.USER_BANK_ACOOUNTS)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user bank accounts' })
  @ApiQuery({
    name: 'accountCategory',
    required: false,
    enum: ['credit', 'debit'],
    description: 'Filter by credit (liability) or debit (asset) accounts',
  })
  @SwaggerApiResponse({
    status: 200,
    description: "User's bank accounts retrieved successfully",
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  async getUserBankAccounts(
    @Req() req,
    @Query('accountCategory') accountCategory?: 'credit' | 'debit',
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Invalid user authentication');
    }
    const userBankAccounts = await this.bankService.getUserBankAccounts(
      userId,
      accountCategory,
    );
    if (userBankAccounts.length === 0) {
      return new ApiResponse(
        200,
        'You have no bank accounts',
        userBankAccounts,
      );
    }
    return new ApiResponse(
      200,
      "User's bank accounts retrieved successfully",
      userBankAccounts,
    );
  }

  @Get(ENDPOINTS.BANK.NET_BANK_BALANCE)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user net bank balance' })
  @SwaggerApiResponse({
    status: 200,
    description: "User's net bank balance retrieved successfully",
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiQuery({
    name: 'timePeriod',
    enum: [
      'today',
      'weekly',
      'monthly',
      'yearly',
      '2years',
      '3years',
      '4years',
      'custom',
    ],
    required: false,
  })
  @ApiQuery({ name: 'customStartDate', type: String, required: false })
  async getUserNetBankBalance(
    @Req() req,
    @Query('timePeriod')
    timePeriod?:
      | 'today'
      | 'weekly'
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
    if (parsedCustomStartDate) {
      timePeriod = 'custom';
    }
    const netBankBalance = await this.bankService.getUserNetBankBalance(
      userId,
      timePeriod,
      parsedCustomStartDate,
    );
    return new ApiResponse(
      200,
      "User's net bank balance retrieved successfully",
      netBankBalance,
    );
  }

  @Get(ENDPOINTS.BANK.NET_WORTH_HISTORY)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get net worth history' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Net worth history retrieved successfully',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiQuery({
    name: 'timePeriod',
    enum: [
      'today',
      'weekly',
      'monthly',
      'yearly',
      '2years',
      '3years',
      '4years',
      'custom',
    ],
    required: false,
  })
  @ApiQuery({ name: 'customStartDate', type: String, required: false })
  async getNetWorthHistory(
    @Req() req,
    @Query('timePeriod')
    timePeriod?:
      | 'today'
      | 'weekly'
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
    if (parsedCustomStartDate) {
      timePeriod = 'custom';
    }
    const netWorthHistory = await this.bankService.getNetWorthHistory(
      userId,
      timePeriod,
      parsedCustomStartDate,
    );
    return new ApiResponse(
      200,
      'Net worth history retrieved successfully',
      netWorthHistory,
    );
  }

  @Get(ENDPOINTS.BANK.NET_WORTH)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user net worth' })
  @SwaggerApiResponse({
    status: 200,
    description: "User's net worth retrieved successfully",
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiQuery({
    name: 'timePeriod',
    enum: [
      'today',
      'weekly',
      'monthly',
      'yearly',
      '2years',
      '3years',
      '4years',
      'custom',
    ],
    required: false,
  })
  @ApiQuery({ name: 'customStartDate', type: String, required: false })
  async getUserNetWorth(
    @Req() req,
    @Query('timePeriod')
    timePeriod?:
      | 'today'
      | 'weekly'
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
    if (parsedCustomStartDate) {
      timePeriod = 'custom';
    }
    const netWorth = await this.bankService.getUserNetWorth(
      userId,
      timePeriod,
      parsedCustomStartDate,
    );
    return new ApiResponse(
      200,
      "User's net worth retrieved successfully",
      netWorth,
    );
  }

  @Get(ENDPOINTS.BANK.BANK_NAMES)
  @ApiOperation({ summary: 'Get all bank names' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Bank names retrieved successfully',
  })
  getBankNames() {
    return this.bankService.getAllBankNames();
  }

  @Get(ENDPOINTS.BANK.CURRENCIES)
  @ApiOperation({ summary: 'Get all currencies' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Currencies retrieved successfully',
  })
  getCurrencyList() {
    return this.bankService.getCurrencyList();
  }

  @Get(ENDPOINTS.BANK.ACCOUNT_TYPES)
  @ApiOperation({ summary: 'Get all account types' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Account types retrieved successfully',
  })
  async getAllAccountTypes() {
    return this.bankService.getAllAccountTypes();
  }
}
