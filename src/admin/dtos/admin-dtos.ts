import { ApiProperty } from '@nestjs/swagger';
import { AccessLevel, AdminRole } from '@prisma/client';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class AdminRegisterDto {
  @ApiProperty()
  @IsEmail()
  @Matches(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/, {
    message: 'Invalid email format',
  })
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message:
      'Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character',
  })
  password: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false, default: 'ADMIN' })
  @IsOptional()
  @IsString()
  role?: AdminRole;

  @ApiProperty({ required: false, default: 'PARTIAL' })
  @IsOptional()
  @IsString()
  accessLevel?: AccessLevel;
}
export class AdminLoginDto {
  @ApiProperty()
  @IsEmail()
  @Matches(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/, {
    message:
      'Invalid email format. Only alphanumeric characters, dots, underscores, and hyphens are allowed.',
  })
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}

