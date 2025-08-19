import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  @Matches(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/, {
    message: 'Invalid email format. Only alphanumeric characters, dots, underscores, and hyphens are allowed.',
  })
  email: string;
}

export class VerifyOtpDto {
  @ApiProperty()
  @IsEmail()
  @Matches(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/, {
    message: 'Invalid email format. Only alphanumeric characters, dots, underscores, and hyphens are allowed.',
  })
  email: string;

  @ApiProperty()
  @IsNumber()
  otp: number;
}

export class SetPasswordDto {
  @ApiProperty()
  @IsEmail()
  @Matches(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/, {
    message: 'Invalid email format. Only alphanumeric characters, dots, underscores, and hyphens are allowed.',
  })
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

  @ApiProperty()
  @IsNotEmpty()
  @MinLength(8)
  confirmPassword: string;
}

export class ResendOtpDto {
  @ApiProperty()
  @IsEmail()
  @Matches(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/, {
    message: 'Invalid email format. Only alphanumeric characters, dots, underscores, and hyphens are allowed.',
  })
  email: string;
}

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  @Matches(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/, {
    message: 'Invalid email format. Only alphanumeric characters, dots, underscores, and hyphens are allowed.',
  })
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}


export class RequestDeleteOtpDto {
  @ApiProperty()
  @IsEmail()
  @Matches(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/, {
    message: 'Invalid email format',
  })
  email: string;
}

export class VerifyDeleteOtpDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsNumber()
  otp: number;
}