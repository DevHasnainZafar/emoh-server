import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  RequestDeleteOtpDto,
  ResendOtpDto,
  SetPasswordDto,
  VerifyDeleteOtpDto,
  VerifyOtpDto,
} from './dtos/auth-dtos';
import { ApiResponse } from 'src/common/dtos/api-response.dto';
import { UserResponseDto } from './dtos/user-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateProfileDto } from './dtos/createProfile.dto';
import { ENDPOINTS } from 'src/constants/Endpoints';
import { AuthGuard } from '@nestjs/passport';
import { UpdateProfileDto } from './dtos/updateProfile.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiBody,
  ApiConsumes,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth')
@ApiSecurity('auth-token')
@Throttle({default:{limit:20,ttl: 300_000}})
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post(ENDPOINTS.AUTH.REGISTER)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Register a new user' })
  @SwaggerApiResponse({
    status: 200,
    description: 'OTP sent to your email',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiBody({ type: RegisterDto })
  async register(@Body() registerDto: RegisterDto) {
    try {
      await this.authService.register(registerDto.email);
      return new ApiResponse(200, 'OTP sent to your email', null);
    } catch (error) {
      return new ApiResponse(400, error.message, null);
    }
  }

  @Post(ENDPOINTS.AUTH.VERIFY_OTP)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Verify OTP' })
  @SwaggerApiResponse({
    status: 200,
    description: 'OTP verified',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiBody({ type: VerifyOtpDto })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    try {
      const { otp, email } = verifyOtpDto;
      const emailUpdate = email.toLowerCase();
      const { userId, accessToken } = await this.authService.verifyOtp(
        otp,
        emailUpdate,
      );
      return new ApiResponse(
        200,
        'OTP verified, you can now set your password',
        { userId, accessToken },
      );
    } catch (error) {
      return new ApiResponse(400, error.message, null);
    }
  }

  @Post(ENDPOINTS.AUTH.SET_PASSWORD)
  @UseGuards(JwtAuthGuard)
  @UsePipes(ValidationPipe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set password' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Password set successfully',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiBody({ type: SetPasswordDto })
  async setPassword(@Request() req, @Body() setPasswordDto: SetPasswordDto) {
    try {
      const { email, password, confirmPassword } = setPasswordDto;
      const emailUpdate = email.toLowerCase();
      if (password !== confirmPassword) {
        throw new BadRequestException('Password does not match');
      }
      const userId = req.user.userId;
      const tokenEmail = req.user.email;
      if (emailUpdate !== tokenEmail?.toLowerCase()) {
        throw new BadRequestException(
          'Email does not match the authenticated user',
        );
      }
      const userResponse: UserResponseDto = await this.authService.setPassword(
        userId,
        emailUpdate,
        password,
      );
      return new ApiResponse(200, 'Password set successfully', userResponse);
    } catch (error) {
      return new ApiResponse(400, error.message, null);
    }
  }

  @Post(ENDPOINTS.AUTH.CREATE_PROFILE)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('profile-image'))
  @UsePipes(ValidationPipe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create user profile' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Profile created successfully',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateProfileDto })
  async createProfile(
    @UploadedFile() file: Express.Multer.File,
    @Body() createProfileDto: CreateProfileDto,
    @Req() req,
  ) {
    try {
      const userId = req.user.userId;
      const user = await this.authService.createProfile(
        userId,
        createProfileDto,
        file,
      );
      return new ApiResponse(200, 'Profile created successfully', user);
    } catch (error) {
      return new ApiResponse(400, error.message, null);
    }
  }

  @Post(ENDPOINTS.AUTH.RESEND_OTP)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Resend OTP' })
  @SwaggerApiResponse({
    status: 200,
    description: 'OTP resent successfully',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiBody({ type: ResendOtpDto })
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    try {
      const { email } = resendOtpDto;
      const emailUpdate = email.toLowerCase();
      const { message } = await this.authService.resendOTP(emailUpdate);
      return new ApiResponse(200, message, null);
    } catch (error) {
      return new ApiResponse(400, error.message, null);
    }
  }

  @Post(ENDPOINTS.AUTH.LOGIN)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Login' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Login successful',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiBody({ type: LoginDto })
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto) {
    try {
      const { email, password } = loginDto;
      const emailUpdate = email.toLowerCase();
      const userResponse: UserResponseDto = await this.authService.login(
        emailUpdate,
        password,
      );
      return new ApiResponse(200, 'Login Successful', userResponse);
    } catch (error) {
      return new ApiResponse(400, error.message, null);
    }
  }

  @Post(ENDPOINTS.AUTH.FORGOT_PASSWORD)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Forgot password' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Password reset email sent',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiBody({ type: ForgotPasswordDto })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    try {
      const { message } = await this.authService.forgotPassword(
        forgotPasswordDto.email.toLowerCase(),
      );
      return new ApiResponse(200, message, null);
    } catch (error) {
      return new ApiResponse(400, error.message, null);
    }
  }

  @Get(ENDPOINTS.AUTH.GOOGLE)
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth' })
  async googleAuth(@Req() req) {}

  @Get(ENDPOINTS.AUTH.REDIRECT_GOOGLE)
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth redirect' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Google OAuth successful',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  async googleAuthRedirect(@Req() req) {
    try {
      const user = req.user;
      const jwtToken = await this.authService.validateOAuthLogin(
        user.email?.toLowerCase(),
        user.firstName,
        user.lastName,
      );
      return new ApiResponse(200, 'Google OAuth successful', { jwtToken });
    } catch (error) {
      return new ApiResponse(400, error.message, null);
    }
  }

  @Get(ENDPOINTS.AUTH.GET_PROFILE)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  async getProfile(@Req() req) {
    try {
      const userId = req.user.userId;
      const userProfile = await this.authService.getProfile(userId);
      return new ApiResponse(
        200,
        'Profile retrieved successfully',
        userProfile,
      );
    } catch (error) {
      return new ApiResponse(400, error.message, null);
    }
  }

  @Patch(ENDPOINTS.AUTH.EDIT_PROFILE)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('profile-image'))
  @UsePipes(ValidationPipe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edit user profile' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: ApiResponse,
  })
  @SwaggerApiResponse({ status: 400, description: 'Bad Request' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateProfileDto })
  async editProfile(
    @UploadedFile() file: Express.Multer.File,
    @Body() updateProfileDto: UpdateProfileDto,
    @Req() req,
  ) {
    const userId = req.user.userId;
    try {
      const updatedProfile = await this.authService.updateProfile(
        userId,
        updateProfileDto,
        file,
      );
      return new ApiResponse(
        200,
        'Profile updated successfully',
        updatedProfile,
      );
    } catch (error) {
      return new ApiResponse(400, error.message, null);
    }
  }
  @Delete()
  @UseGuards(JwtAuthGuard)
  async deleteAccount(@Req() req) {
    const userId = req.user.userId;
    await this.authService.deleteAccount(userId);
    return new ApiResponse(200, 'Account deleted successfully', null);
  }




  @Post(ENDPOINTS.AUTH.REQUEST_DELETE_OTP)
  @Throttle({
  default: {
    limit: 25,
    ttl: 300_000, 
    },
})
@UsePipes(ValidationPipe)
async requestDeleteOtp(@Body() requestDeleteOtpDto:RequestDeleteOtpDto) {
  try {
    const result = await this.authService.requestDeleteOtp(requestDeleteOtpDto);
    return new ApiResponse(200, result.message, null);
  } catch (error) {
    return new ApiResponse(400, error.message, null);
  }
}

@Post(ENDPOINTS.AUTH.VERIFY_DELETE_OTP)
@Throttle({
  default: {
    limit: 25,
    ttl: 300_000,
    },
})
@UsePipes(ValidationPipe)
async verifyDeleteOtp(@Body() verifyDeleteOtpDto:VerifyDeleteOtpDto) {
  try {
    const result = await this.authService.verifyDeleteOtpAndDelete(verifyDeleteOtpDto);
    return new ApiResponse(200, result.message, null);
  } catch (error) {
    return new ApiResponse(400, error.message, null);
  }
}
}
