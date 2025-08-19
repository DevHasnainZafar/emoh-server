import { ApiProperty } from '@nestjs/swagger';
import { AccountType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateBankAccountDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  accountName: string;

  @ApiProperty({ enum: AccountType })
  @IsNotEmpty()
  @IsEnum(AccountType)
  accountType: AccountType;

  @ApiProperty()
  @IsOptional()
  @IsString()
  accountImage: string;

  @ApiProperty()
  @IsOptional()
  @IsNumber({}, { message: 'Account amount must be a valid number' })
  @Min(0, { message: 'Account amount must be zero or greater' })
  @Max(99999999, { message: 'Account amount must not exceed 8 digits' })
  accountAmount?: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  accountCurrencyCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  plaidAccountId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  plaidItemId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  plaidAccountNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isPlaidAccount?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  plaidInstitutionId?: string;

  lastSyncAt?: Date;
}
