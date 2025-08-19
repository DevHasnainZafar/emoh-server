import { PartialType } from '@nestjs/swagger';
import { CreateExpenseDto } from './create-expense.dto';

export class EditExpenseDto extends PartialType(CreateExpenseDto) {}
