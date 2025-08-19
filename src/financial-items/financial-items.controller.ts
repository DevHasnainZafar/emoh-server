// financial-items.controller.ts
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
import { FinancialItemsService } from './financial-items.service';
import { ENDPOINTS } from 'src/constants/Endpoints';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateFinancialItemDto } from './dtos/create-financial-item.dto';
import { ApiResponse } from 'src/common/dtos/api-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { UpdateFinancialItemDto } from './dtos/update-financial-item.dto';

@ApiTags('Financial Items')
@ApiBearerAuth()
@Controller('financial-items')
export class FinancialItemsController {
  constructor(private readonly financialItemsService: FinancialItemsService) {}

  @Post(ENDPOINTS.FINANCIALITEMS.ADD_FINANCIAL_ITEM)
  @UseGuards(JwtAuthGuard)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Add a financial item (asset or liability)' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Financial item added successfully',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiBody({ type: CreateFinancialItemDto })
  async addFinancialItem(
    @Body() createFinancialItemDto: CreateFinancialItemDto,
    @Req() req,
  ) {
    const userId = req.user.userId;
    const financialItem = await this.financialItemsService.addFinancialItem(
      userId,
      createFinancialItemDto,
    );
    return new ApiResponse(
      200,
      'Financial Item added successfully',
      financialItem,
    );
  }
  @Patch(ENDPOINTS.FINANCIALITEMS.EDIT_FINANCIAL_ITEM)
  @UseGuards(JwtAuthGuard)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Update a financial item' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Financial item updated successfully',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiParam({ name: 'id', type: Number, description: 'Financial item ID' })
  @ApiBody({ type: UpdateFinancialItemDto })
  async updateFinancialItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFinancialItemDto: UpdateFinancialItemDto,
    @Req() req,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Invalid user authentication');
    }
    const updatedItem = await this.financialItemsService.updateFinancialItem(
      id,
      userId,
      updateFinancialItemDto,
    );
    return new ApiResponse(
      200,
      'Financial item updated successfully',
      updatedItem,
    );
  }

  @Delete(ENDPOINTS.FINANCIALITEMS.DELETE_FINANCIAL_ITEM)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a financial item' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Financial item deleted successfully',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiParam({ name: 'id', type: Number, description: 'Financial item ID' })
  async deleteFinancialItem(@Param('id', ParseIntPipe) id: number, @Req() req) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Invalid user authentication');
    }
    await this.financialItemsService.deleteFinancialItem(id, userId);
    return new ApiResponse(200, 'Financial item deleted successfully', null);
  }

  @Get(ENDPOINTS.FINANCIALITEMS.GET_USER_FINANCIAL_ITEMS)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get user's financial items" })
  @SwaggerApiResponse({
    status: 200,
    description: "User's financial items retrieved successfully",
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiQuery({ name: 'itemType', enum: ['Asset', 'Liability'], required: false })
  async getUserFinancialItems(
    @Req() req,
    @Query('itemType') itemType?: 'Asset' | 'Liability',
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Invalid user authentication');
    }
    const financialItems =
      await this.financialItemsService.getUserFinancialItems(userId, itemType);
    return new ApiResponse(
      200,
      "User's financial items retrieved successfully",
      financialItems,
    );
  }

  @Get(ENDPOINTS.FINANCIALITEMS.NET_ASSETS)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get user's net assets" })
  @SwaggerApiResponse({
    status: 200,
    description: "User's net assets calculated successfully",
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
  async getNetAssets(
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
    const netAssets = await this.financialItemsService.getUserNetAssets(
      userId,
      timePeriod,
      parsedCustomStartDate,
    );
    return new ApiResponse(
      200,
      "User's net assets calculated successfully",
      netAssets,
    );
  }

  @Get(ENDPOINTS.FINANCIALITEMS.NET_LIABILITIES)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get user's net liabilities" })
  @SwaggerApiResponse({
    status: 200,
    description: "User's net liabilities calculated successfully",
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
  async getNetLiabilities(
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
    const netLiabilities = await this.financialItemsService.getUserNetLiabilities(
      userId,
      timePeriod,
      parsedCustomStartDate,
    );
    return new ApiResponse(
      200,
      "User's net liabilities calculated successfully",
      netLiabilities,
    );
  }
}
