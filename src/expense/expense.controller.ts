import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { ENDPOINTS } from 'src/constants/Endpoints';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ApiResponse } from 'src/common/dtos/api-response.dto';
import { EditExpenseDto } from './dto/update-expense.dto';
import { ExpenseFilterDto } from './dto/expense-filter.dto';
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

@ApiTags('Expense')
@ApiSecurity('auth-token')
@Controller('expense')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post(ENDPOINTS.EXPENSE.ADD_EXPENSE)
  @UsePipes(ValidationPipe)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add an expense' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Expense added successfully',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiBody({ type: CreateExpenseDto })
  async addExpense(@Body() createExpenseDto: CreateExpenseDto, @Req() req) {
    const userId = req.user.userId;
    const newExpense = await this.expenseService.addExpense(
      userId,
      createExpenseDto,
    );
    return new ApiResponse(200, 'Expense added successfully', newExpense);
  }

  @Patch(ENDPOINTS.EXPENSE.EDIT_EXPENSE)
  @UsePipes(ValidationPipe)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edit an expense' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Expense updated successfully',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiParam({ name: 'expenseId', type: Number, description: 'Expense ID' })
  @ApiBody({ type: EditExpenseDto })
  async editExpense(
    @Body() editExpenseDto: EditExpenseDto,
    @Req() req,
    @Param('expenseId') expenseId: number,
  ) {
    const userId = req.user.userId;
    const updatedExpense = await this.expenseService.editExpense(
      userId,
      expenseId,
      editExpenseDto,
    );
    return new ApiResponse(200, 'Expense updated successfully', updatedExpense);
  }

  @Delete(ENDPOINTS.EXPENSE.DELETE_EXPENSE)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an expense' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Expense deleted successfully',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiParam({ name: 'expenseId', type: Number, description: 'Expense ID' })
  async deleteExpense(@Param('expenseId') expenseId: number, @Req() req) {
    const userId = req.user.userId;
    await this.expenseService.deleteExpense(userId, expenseId);
    return new ApiResponse(200, 'Expense deleted successfully', null);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user expenses' })
  @SwaggerApiResponse({
    status: 200,
    description: 'User expenses retrieved successfully',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiQuery({ name: 'filters', type: ExpenseFilterDto, required: false })
  async getUserExpense(@Req() req, @Query() filters: ExpenseFilterDto) {
    const userId = req.user.userId;
    const userExpense = await this.expenseService.getUserExpense(
      userId,
      filters,
    );
    if (userExpense.length === 0) {
      return new ApiResponse(200, "You haven't added any expenses", []);
    }
    return new ApiResponse(
      200,
      'User Expense retrieved successfully',
      userExpense,
    );
  }

  @Get(ENDPOINTS.EXPENSE.GET_NET_EXPENSE)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user net expense' })
  @SwaggerApiResponse({
    status: 200,
    description: 'User net expense fetched successfully',
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
  async getUserNetExpense(
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
      throw new NotFoundException('User not found');
    }
    const parsedCustomStartDate = customStartDate
      ? new Date(customStartDate)
      : undefined;
    if (parsedCustomStartDate) {
      timePeriod = 'custom';
    }
    const netBudget = await this.expenseService.getUserNetExpense(
      userId,
      timePeriod,
      parsedCustomStartDate,
    );
    return new ApiResponse(
      200,
      'User net expense fetched successfully',
      netBudget,
    );
  }
  @Get(ENDPOINTS.EXPENSE.GET_AVERAGE_EXPENSE)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get average expense by timePeriod (today, weekly, monthly, yearly)',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Average expense fetched successfully',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  async getAverageExpense(
    @Req() req,
    @Query('timePeriod')
    timePeriod?: 'today' | 'weekly' | 'monthly' | 'yearly',
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new NotFoundException('User not found');

    const result = await this.expenseService.getAverageExpense(
      userId,
      timePeriod,
    );
    const message = result.note
      ? result.note
      : `Average ${timePeriod} expense fetched successfully`;
    const { note, ...responseData } = result;

    return new ApiResponse(200, message, responseData);
  }

  @Get(ENDPOINTS.EXPENSE.GET_TOP_MERCHANTS)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get top merchants' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Top merchants fetched successfully',
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
  async getTopMerchants(
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
    const parsedCustomStartDate = customStartDate
      ? new Date(customStartDate)
      : undefined;
    if (parsedCustomStartDate) {
      timePeriod = 'custom';
    }
    const topMerchants = await this.expenseService.getTopMerchants(
      userId,
      timePeriod,
      parsedCustomStartDate,
    );
    return new ApiResponse(
      200,
      'Top merchants fetched successfully',
      topMerchants,
    );
  }

  @Get(ENDPOINTS.EXPENSE.GET_TOP_CATEGORIES)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get top categories' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Top categories fetched successfully',
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
  async getTopCategories(
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
      throw new NotFoundException('User not found');
    }
    const parsedCustomStartDate = customStartDate
      ? new Date(customStartDate)
      : undefined;
    if (parsedCustomStartDate) {
      timePeriod = 'custom';
    }
    const topCategories = await this.expenseService.getTopCategories(
      userId,
      timePeriod,
      parsedCustomStartDate,
    );
    return new ApiResponse(
      200,
      'Top categories fetched successfully',
      topCategories,
    );
  }
}
