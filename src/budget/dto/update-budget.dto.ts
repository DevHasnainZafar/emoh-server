import { PartialType } from '@nestjs/swagger';
import { CreateBudgetDto } from './create-budget.dto';

export class EditBudgetDto extends PartialType(CreateBudgetDto) {}
