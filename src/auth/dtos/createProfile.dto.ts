import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
export class CreateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
   @Matches(/^[\p{L}\p{M}' ]+$/u, {
  message: 'firstName can only contain letters, apostrophes, and spaces',
})
  @Length(2, 20, { message: 'First name must be between 2 and 20 characters' })
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^[\p{L}\p{M}' ]+$/u, {
  message: 'lastName can only contain letters, apostrophes, and spaces',
})
  @Length(2, 20, { message: 'Last name must be between 2 and 20 characters' })
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  defaultCurrencyName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(3, 3, {
    message: 'The default currency code must be exactly 3 characters long',
  })
  defaultCurrencyCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  defaultLanguage?: string;
}
