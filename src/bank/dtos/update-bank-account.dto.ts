import { ApiProperty } from '@nestjs/swagger';
import { AccountType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateBankAccountDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  accountName?: string;

  @ApiProperty({ enum: AccountType, required: false })
  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;

  @ApiProperty()
  @IsNumber({}, { message: 'Account amount must be a valid number' })
  @Min(0, { message: 'Account amount must be zero or greater' })
  @Max(99999999, { message: 'Account amount must not exceed 8 digits' })
  accountAmount: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  accountCurrencyCode?: string;
}