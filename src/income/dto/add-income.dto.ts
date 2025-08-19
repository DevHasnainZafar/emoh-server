import { ApiProperty } from '@nestjs/swagger';
import {
  RecurringType,
  CustomRecurringDays,
  CustomRecurringInterval,
} from '@prisma/client';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  Min,
  IsString,
  Length,
  Max,
} from 'class-validator';

export class AddIncomeDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  bankId: number;

  @ApiProperty()
  @IsNotEmpty()
  receivedIn: string;

  @ApiProperty()
  @IsNotEmpty()
  receivedInBankImage: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Length(2, 20, {
    message: 'Received from must be between 2 and 20 characters',
  })
  receivedFrom: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Length(2, 20, {
    message: 'Category Name must be between 2 and 20 characters',
  })
  categoryName: string;

  @ApiProperty({ enum: RecurringType })
  @IsEnum(RecurringType)
  recurringType: RecurringType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  customRecurringUnit?: number;

  @ApiProperty({ enum: CustomRecurringInterval, required: false })
  @IsOptional()
  @IsEnum(CustomRecurringInterval)
  customRecurringInterval?: CustomRecurringInterval;

  @ApiProperty({ enum: CustomRecurringDays, isArray: true, required: false })
  @IsOptional()
  @IsEnum(CustomRecurringDays, { each: true })
  customRecurringDays?: CustomRecurringDays[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  customRecurringStartDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  customRecurringEndDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  incomeDate: Date;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber({}, { message: 'Income amount must be a valid number' })
  @Min(0, { message: 'Income amount must be zero or greater' })
  @Max(99999999, { message: 'Income amount must not exceed 8 digits' })
  incomeAmount: number;

  @ApiProperty()
  @IsNotEmpty()
  incomeAmountCurrencyCode: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  deletedAt?: boolean;
}
