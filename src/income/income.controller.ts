import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
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
import { IncomeService } from './income.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AddIncomeDto } from './dto/add-income.dto';
import { ApiResponse } from 'src/common/dtos/api-response.dto';
import { ENDPOINTS } from 'src/constants/Endpoints';
import { EditIncomeDto } from './dto/edit-income.dto';
import { IncomeFilterDto } from './dto/income-filter.dto';
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

@ApiTags('Income')
@ApiSecurity('auth-token')
@Controller('income')
export class IncomeController {
  constructor(private readonly incomeService: IncomeService) {}

  @Post(ENDPOINTS.INCOME.ADD_INCOME)
  @UsePipes(ValidationPipe)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add income' })
  @SwaggerApiResponse({ status: 200, description: 'Income added successfully', type: ApiResponse })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiBody({ type: AddIncomeDto })
  async addIncome(@Body() addIncomeDto: AddIncomeDto, @Req() req) {
    const userId = req.user.userId;
    const newIncome = await this.incomeService.addIncome(userId, addIncomeDto);
    return new ApiResponse(200, 'Income added successfully', newIncome);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user income' })
  @SwaggerApiResponse({ status: 200, description: 'User income retrieved successfully', type: ApiResponse })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiQuery({ name: 'filters', type: IncomeFilterDto, required: false })
  async getUserIncome(@Req() req, @Query() filters: IncomeFilterDto) {
    const userId = req.user.userId;
    const userIncome = await this.incomeService.getUserIncome(userId, filters);
    if (userIncome.length === 0) {
      return new ApiResponse(200, "You haven't added any income", []);
    }
    return new ApiResponse(200, 'User income retrieved successfully', userIncome);
  }

  @Delete(ENDPOINTS.INCOME.DELETE_INCOME)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete income' })
  @SwaggerApiResponse({ status: 200, description: 'Income deleted successfully', type: ApiResponse })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiParam({ name: 'incomeId', type: Number, description: 'Income ID' })
  async deleteIncome(
    @Param('incomeId', ParseIntPipe) incomeId: number,
    @Req() req,
  ) {
    const userId = req.user.userId;
    await this.incomeService.deleteIncome(userId, incomeId);
    return new ApiResponse(200, 'Income deleted successfully', null);
  }

  @Patch(ENDPOINTS.INCOME.EDIT_INCOME)
  @UsePipes(ValidationPipe)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edit income' })
  @SwaggerApiResponse({ status: 200, description: 'Income updated successfully', type: ApiResponse })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiParam({ name: 'incomeId', type: Number, description: 'Income ID' })
  @ApiBody({ type: EditIncomeDto })
  async editIncome(
    @Param('incomeId', ParseIntPipe) incomeId: number,
    @Body() editIncomeDto: EditIncomeDto,
    @Req() req,
  ) {
    const userId = req.user.userId;
    const updatedIncome = await this.incomeService.editIncome(userId, incomeId, editIncomeDto);
    return new ApiResponse(200, 'Income updated successfully', updatedIncome);
  }

  @Get(ENDPOINTS.INCOME.GET_NET_INCOME)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user net income' })
  @SwaggerApiResponse({ status: 200, description: 'User net income fetched successfully', type: ApiResponse })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiQuery({ name: 'timePeriod', enum: ['today', 'weekly', 'monthly', 'yearly', '2years', '3years', '4years', 'custom'], required: false })
  @ApiQuery({ name: 'customStartDate', type: String, required: false })
  async getUserNetIncome(
    @Req() req,
    @Query('timePeriod') timePeriod?: 'today' | 'weekly' | 'monthly' | 'yearly' | '2years' | '3years' | '4years' | 'custom',
    @Query('customStartDate') customStartDate?: string,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new NotFoundException('User not found');
    }
    const parsedCustomStartDate = customStartDate ? new Date(customStartDate) : undefined;
    if (parsedCustomStartDate) {
      timePeriod = 'custom';
    }
    const netWorth = await this.incomeService.getUserNetIncome(userId, timePeriod, parsedCustomStartDate);
    return new ApiResponse(200, 'User net worth fetched successfully', netWorth);
  }
}