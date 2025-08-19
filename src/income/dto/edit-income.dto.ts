import { PartialType } from '@nestjs/swagger';
import { AddIncomeDto } from './add-income.dto';

export class EditIncomeDto extends PartialType(AddIncomeDto) {}
