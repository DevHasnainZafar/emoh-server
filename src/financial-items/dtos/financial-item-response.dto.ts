import { ApiProperty } from '@nestjs/swagger';
import { ItemType } from '@prisma/client';

export class FinancialItemResponse {
  @ApiProperty()
  itemId: number;

  @ApiProperty()
  itemName: string;

  @ApiProperty({ enum: ItemType })
  itemType: ItemType;

  @ApiProperty()
  givenAmount: number;

  @ApiProperty()
  givenCurrencyCode: string;

  @ApiProperty({ required: false })
  amountInDefaultCurrency?: number | null;

  @ApiProperty({ required: false })
  amountInCADCurrency?: number | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  isBankAccount?: boolean;

  @ApiProperty({ required: false })
  isBankCreditAccount?: boolean;
}
