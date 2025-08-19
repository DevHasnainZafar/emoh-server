import { ApiProperty } from '@nestjs/swagger';
import { BudgetContributionCycle } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateBudgetDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  categoryName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber({}, { message: 'Budget amount must be a valid number' })
  @Min(0, { message: 'Budget amount must be zero or greater' })
  @Max(99999999, { message: 'Budget amount must not exceed 8 digits' })
  budgetAmount: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  budgetCurrencyCode: string;

  @ApiProperty({ enum: BudgetContributionCycle })
  @IsEnum(BudgetContributionCycle)
  @IsNotEmpty()
  budgetContributionCycle: BudgetContributionCycle;
}
