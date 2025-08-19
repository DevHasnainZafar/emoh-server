import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AddPlaidAccountDto {
  @ApiProperty()
  @IsString()
  publicToken: string;
}
