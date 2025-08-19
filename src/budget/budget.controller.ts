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
import { BudgetService } from './budget.service';
import { ENDPOINTS } from 'src/constants/Endpoints';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { ApiResponse } from 'src/common/dtos/api-response.dto';
import { EditBudgetDto } from './dto/update-budget.dto';
import { BudgetFilterDto } from './dto/budget-filter.dto';
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

@ApiTags('Budget')
@ApiSecurity('auth-token')
@Controller('budget')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post(ENDPOINTS.BUDGET.ADD_BUDGET)
  @UsePipes(ValidationPipe)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a budget' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Budget added successfully',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiBody({ type: CreateBudgetDto })
  async addIncome(@Body() createBudgetDto: CreateBudgetDto, @Req() req) {
    const userId = req.user.userId;
    const newBudget = await this.budgetService.addBudget(
      userId,
      createBudgetDto,
    );
    return new ApiResponse(200, 'Budget added successfully', newBudget);
  }

  @Patch(ENDPOINTS.BUDGET.EDIT_BUDGET)
  @UsePipes(ValidationPipe)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edit a budget' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Budget updated successfully',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiParam({ name: 'budgetId', type: Number, description: 'Budget ID' })
  @ApiBody({ type: EditBudgetDto })
  async editBudget(
    @Body() editBudgetDto: EditBudgetDto,
    @Req() req,
    @Param('budgetId') budgetId: number,
  ) {
    const userId = req.user.userId;
    const updatedBudget = await this.budgetService.editBudget(
      userId,
      budgetId,
      editBudgetDto,
    );
    return new ApiResponse(200, 'Budget updated successfully', updatedBudget);
  }

  @Delete(ENDPOINTS.BUDGET.DELETE_BUDGET)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a budget' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Budget deleted successfully',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiParam({ name: 'budgetId', type: Number, description: 'Budget ID' })
  async deleteBudget(@Param('budgetId') budgetId: number, @Req() req) {
    const userId = req.user.userId;
    await this.budgetService.deleteBudget(userId, budgetId);
    return new ApiResponse(200, 'Budget deleted successfully', null);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user budgets' })
  @SwaggerApiResponse({
    status: 200,
    description: 'User budgets retrieved successfully',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiQuery({ name: 'filters', type: BudgetFilterDto, required: false })
  async getUserBudget(@Req() req, @Query() filters: BudgetFilterDto) {
    const userId = req.user.userId;
    const userBudget = await this.budgetService.getUserBudget(userId, filters);
    if (userBudget.length === 0) {
      return new ApiResponse(200, "You haven't added any budgets", []);
    }
    return new ApiResponse(
      200,
      'User budgets retrieved successfully',
      userBudget,
    );
  }

  @Get(ENDPOINTS.BUDGET.GET_NET_BUDGET)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user net budget' })
  @SwaggerApiResponse({
    status: 200,
    description: 'User net budget fetched successfully',
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
  async getUserNetBudget(
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
    const netBudget = await this.budgetService.getUserNetBudget(
      userId,
      timePeriod,
      parsedCustomStartDate,
    );
    return new ApiResponse(
      200,
      'User net budget fetched successfully',
      netBudget,
    );
  }
}
