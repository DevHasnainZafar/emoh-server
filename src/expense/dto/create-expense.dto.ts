import { ApiProperty } from '@nestjs/swagger';
import { InclusionStatus, RecurringType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  bankId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Length(1, 100, {
    message: 'Paid from must be between 1 and 100 characters',
  })
  paidFrom: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  paidFromImage: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Length(1, 100, {
    message: 'PaidTo must be between 1 and 100 characters',
  })
  paidTo: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Length(1, 100, {
    message: 'Paid To Category must be between 1 and 100 characters',
  })
  paidToCategory: string;

  @ApiProperty({ enum: InclusionStatus })
  @IsEnum(InclusionStatus)
  @IsNotEmpty()
  taxStatus: InclusionStatus;

  @ApiProperty({ required: false })
  @ValidateIf((o) => o.taxStatus !== 'Out_Of_Scope')
  @IsInt()
  @Min(0, { message: 'Tax percentage must be zero or greater' })
  taxPercentage?: number;

  @ApiProperty({ enum: InclusionStatus })
  @IsEnum(InclusionStatus)
  @IsNotEmpty()
  fxMarkupStatus: InclusionStatus;

  @ApiProperty({ required: false })
  @ValidateIf((o) => o.fxMarkupStatus !== 'Out_Of_Scope')
  @IsInt()
  @Min(0, { message: 'FX markup value must be zero or greater' })
  fxMarkupValue?: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber({}, { message: 'Expense amount must be a valid number' })
  @Min(0, { message: 'Expense amount must be zero or greater' })
  @Max(99999999, { message: 'Expense amount must not exceed 8 digits' })
  expenseAmount: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  expenseCurrencyCode: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expenseDate?: Date;

  @ApiProperty({ enum: RecurringType })
  @IsEnum(RecurringType)
  @IsNotEmpty()
  recurringType: RecurringType;
}
