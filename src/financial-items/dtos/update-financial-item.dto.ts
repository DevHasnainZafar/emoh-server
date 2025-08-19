import { PartialType } from '@nestjs/swagger';
import { CreateFinancialItemDto } from './create-financial-item.dto';

export class UpdateFinancialItemDto extends PartialType(
  CreateFinancialItemDto,
) {}
