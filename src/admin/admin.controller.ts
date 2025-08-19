import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminLoginDto, AdminRegisterDto } from './dtos/admin-dtos';
import { ApiResponse } from 'src/common/dtos/api-response.dto';
import {
  ApiTags,
  ApiResponse as SwaggerApiResponse,
} from '@nestjs/swagger';
import { ENDPOINTS } from 'src/constants/Endpoints';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { UpdateAdminProfileDto } from './dtos/update-admin-profile.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Admin Auth')
@Throttle({default:{limit:40,ttl: 300_000}})
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post(ENDPOINTS.AUTH.REGISTER)
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileInterceptor('profile-image'))
  async register(
    @UploadedFile() file: Express.Multer.File,
    @Body() registerDto: AdminRegisterDto,
  ) {
    try {
      const result = await this.adminService.register(file, registerDto);
      return new ApiResponse(200, 'Admin registered successfully', result);
    } catch (error) {
      return new ApiResponse(400, error.message, null);
    }
  }

  @Post(ENDPOINTS.ADMIN.LOGIN)
  @UsePipes(ValidationPipe)
  async login(@Body() loginDto: AdminLoginDto) {
    try {
      const result = await this.adminService.login(loginDto);
      return new ApiResponse(200, 'Login successful', result);
    } catch (error) {
      return new ApiResponse(400, error.message, null);
    }
  }
  @Patch(ENDPOINTS.ADMIN.UPDATE_PROFILE)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('profile-image'))
  @UsePipes(ValidationPipe)
  async updateProfile(
    @UploadedFile() file: Express.Multer.File,
    @Body() updateDto: UpdateAdminProfileDto,
    @Req() req,
  ) {
    try {
      const adminId = req.user.userId;
      const { message, data } = await this.adminService.updateProfile(
        adminId,
        updateDto,
        file,
      );
      return new ApiResponse(200, message, data);
    } catch (error) {
      return new ApiResponse(error.status || 400, error.message, null);
    }
  }

  @Get(ENDPOINTS.ADMIN.All_USERS)
  @UseGuards(JwtAuthGuard)
  async getAllUsers(
    @Query('timePeriod')
    timePeriod?:
      | 'today'
      | 'weekly'
      | 'monthly'
      | 'yearly'
      | '2years'
      | '3years'
      | '4years'
      | 'custom',
    @Query('customStartDate') customStartDate?: string,
  ) {
    try {
      const parsedCustomStartDate = customStartDate
        ? new Date(customStartDate)
        : undefined;
      if (parsedCustomStartDate) {
        timePeriod = 'custom';
      }
      const users = await this.adminService.getAllUsers(
        timePeriod,
        parsedCustomStartDate,
      );
      return new ApiResponse(200, 'All Users', users);
    } catch (error) {
      return new ApiResponse(400, error.message, null);
    }
  }

  @Get(ENDPOINTS.ADMIN.ALL_ADMINS)
  @UseGuards(JwtAuthGuard)
  async getAllAdmins(@Query('invitationStatus') invitationStatus: string) {
    try {
      const admins = await this.adminService.getAllAdmins(invitationStatus);
      return new ApiResponse(200, 'All Admins', admins);
    } catch (error) {
      return new ApiResponse(400, error.message, null);
    }
  }
  @Get(ENDPOINTS.ADMIN.USER_DETAILS)
  @UseGuards(JwtAuthGuard)
  async getUserDetails(@Param('userId') userId: number) {
    try {
      const user = await this.adminService.getUserDetails(userId);
      return new ApiResponse(200, 'User details fetched successfully', user);
    } catch (error) {
      return new ApiResponse(error.status || 400, error.message, null);
    }
  }
  @Get(ENDPOINTS.ADMIN.USERS_COUNT)
  @UseGuards(JwtAuthGuard)
  async getUserCounts(
    @Query('timePeriod')
    timePeriod?:
      | 'today'
      | 'weekly'
      | 'monthly'
      | 'yearly'
      | '2years'
      | '3years'
      | '4years'
      | 'custom',
    @Query('customStartDate') customStartDate?: string,
  ) {
    const result = await this.adminService.getUserCounts(
      timePeriod,
      customStartDate,
    );
    return new ApiResponse(200, 'User counts retrieved successfully', result);
  }

  @Get(ENDPOINTS.ADMIN.GET_PROFILE)
  @UseGuards(JwtAuthGuard)
  async getAdminProfile(@Req() req) {
    try {
      const adminId = req.user.userId;
      const userProfile = await this.adminService.getAdminProfile(adminId);
      return new ApiResponse(
        200,
        'Profile retrieved successfully',
        userProfile,
      );
    } catch (error) {
      return new ApiResponse(400, error.message, null);
    }
  }

  @Patch(ENDPOINTS.ADMIN.BLOCK_USER)
  @UseGuards(JwtAuthGuard)
  async blockUser(@Param('userId') userId: number) {
    try {
      const result = await this.adminService.updateUserStatus(userId, {
        isBlocked: true,
      });
      return new ApiResponse(200, 'User blocked successfully', result);
    } catch (error) {
      return new ApiResponse(error.status || 400, error.message, null);
    }
  }

  @Patch(ENDPOINTS.ADMIN.UNBLOCK_USER)
  @UseGuards(JwtAuthGuard)
  async unblockUser(@Param('userId') userId: number) {
    try {
      const result = await this.adminService.updateUserStatus(userId, {
        isBlocked: false,
      });
      return new ApiResponse(200, 'User unblocked successfully', result);
    } catch (error) {
      return new ApiResponse(error.status || 400, error.message, null);
    }
  }

  @Patch(ENDPOINTS.ADMIN.DElETE_USER)
  @UseGuards(JwtAuthGuard)
  async deleteUser(@Param('userId') userId: number) {
    try {
      const result = await this.adminService.updateUserStatus(userId, {
        isDeleted: true,
      });
      return new ApiResponse(200, 'User deleted successfully', result);
    } catch (error) {
      return new ApiResponse(error.status || 400, error.message, null);
    }
  }
}
