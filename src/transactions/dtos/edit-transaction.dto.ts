import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';
export class EditTransactionDto {
  @IsOptional()
  @IsNumber()
  amountInGivenCurrency?: number;

  @IsOptional()
  @IsString()
  amountCurrency?: string;

  @IsOptional()
  @IsNumber()
  fkBankId?: number;

  @IsOptional()
  @IsString()
  partyName?: string;

  @IsOptional()
  @IsString()
  categoryName?: string;

  @IsOptional()
  @IsDateString()
  transactionDate?: Date;
}
