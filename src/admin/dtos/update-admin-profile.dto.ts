import { ApiProperty } from '@nestjs/swagger';
import { AccessLevel, AdminRole } from '@prisma/client';
import {
  IsOptional,
  IsString,
  MinLength,
  Matches,
  ValidateIf,
  IsNotEmpty,
  IsEmail,
} from 'class-validator';

export class UpdateAdminProfileDto {
  @ApiProperty()
  @IsEmail()
  @Matches(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/, {
    message: 'Invalid email format',
  })
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  profilePic?: string;

  @IsOptional()
  @IsString()
  role?: AdminRole;

  @IsOptional()
  @IsString()
  accessLevel?: AccessLevel;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message:
      'Password must contain at least 1 uppercase, 1 lowercase, 1 number and 1 special character',
  })
  newPassword?: string;

  @ValidateIf((o) => o.newPassword)
  @IsNotEmpty()
  @IsString()
  currentPassword?: string;
}
