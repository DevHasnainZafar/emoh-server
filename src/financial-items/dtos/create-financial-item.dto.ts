import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ItemType } from '@prisma/client';

export class CreateFinancialItemDto {
  @ApiProperty()
  @IsString()
  itemName: string;

  @ApiProperty({ enum: ItemType, default: ItemType.Asset })
  @IsEnum(ItemType)
  itemType: ItemType;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber({}, { message: 'Expense amount must be a valid number' })
  @Min(0, { message: 'Expense amount must be zero or greater' })
  @Max(99999999, { message: 'Expense amount must not exceed 8 digits' })
  givenAmount: number;

  @ApiProperty({ default: 'CAD' })
  @IsString()
  @IsOptional()
  givenCurrencyCode?: string;
}
