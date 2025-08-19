import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AdminRegisterDto, AdminLoginDto } from './dtos/admin-dtos';
import { S3Service } from 'src/s3/s3.service';
import { UpdateAdminProfileDto } from './dtos/update-admin-profile.dto';
import { Admin } from '@prisma/client';
import { getStartDateByTimePeriod } from 'src/utils/dateFilter.util';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private s3Service: S3Service,
  ) {}

  async register(file: Express.Multer.File, registerDto: AdminRegisterDto) {
    try {
      const profilePicUrl = file ? await this.s3Service.uploadFile(file) : null;
      const { email, password, name, role, accessLevel } = registerDto;
      const lowerCaseEmail = email.toLowerCase();
      const existingAdmin = await this.prisma.admin.findUnique({
        where: { email: lowerCaseEmail },
      });
      if (existingAdmin) {
        throw new BadRequestException('Admin already exists');
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const admin = await this.prisma.admin.create({
        data: {
          email: lowerCaseEmail,
          name,
          password: hashedPassword,
          profilePic: profilePicUrl,
          role,
          accessLevel,
        },
      });
      const payload = { email: admin.email, sub: admin.adminId };
      const accessToken = this.jwtService.sign(payload);
      const signedProfilePicUrl = profilePicUrl
        ? await this.s3Service.getSignedUrl(profilePicUrl)
        : null;
      return {
        adminId: admin.adminId,
        email: admin.email,
        name: admin.name,
        profilePic: signedProfilePicUrl,
        dbProfilePic: profilePicUrl,
        role: admin.role,
        accessLevel: admin.accessLevel,
        accessToken,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error Registering in:', error);
      throw new InternalServerErrorException('Failed to Register Admin');
    }
  }
  async login(loginDto: AdminLoginDto) {
    try {
      const { email, password } = loginDto;
      const lowerCaseEmail = email.toLowerCase();

      const admin = await this.prisma.admin.findUnique({
        where: { email: lowerCaseEmail },
      });

      if (!admin) {
        throw new NotFoundException('Admin not found');
      }

      if (admin.isBlocked) {
        throw new BadRequestException('Account blocked');
      }

      if (admin.isDeleted) {
        throw new BadRequestException('Account deleted');
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        admin.password as string,
      );
      if (!isPasswordValid) {
        throw new BadRequestException('Invalid credentials');
      }

      const payload = {
        email: admin.email,
        sub: admin.adminId,
        name: admin.name,
        accessLevel: admin.accessLevel,
        profilePic: admin.profilePic,
      };
      const accessToken = this.jwtService.sign(payload);
      const signedProfilePicUrl = admin.profilePic
        ? await this.s3Service.getSignedUrl(admin.profilePic)
        : null;
      return {
        adminId: admin.adminId,
        email: admin.email,
        name: admin.name,
        profilePic: signedProfilePicUrl,
        dbProfilePic: admin.profilePic,
        role: admin.role,
        accessLevel: admin.accessLevel,
        accessToken,
      };
    } catch (error) {
      if (error instanceof NotFoundException || BadRequestException) {
        throw error;
      }
      console.error('Error Logging in:', error);
      throw new InternalServerErrorException('Failed to Logged In');
    }
  }
  async getAdminProfile(adminId: number) {
    const admin = await this.prisma.admin.findUnique({
      where: { adminId },
    });
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }
    const signedProfilePicUrl = admin.profilePic
      ? await this.s3Service.getSignedUrl(admin.profilePic)
      : null;
    return {
      ...admin,
      dbProfilePic: admin.profilePic,
      profilePic: signedProfilePicUrl,
    };
  }
  async updateProfile(
    adminId: number,
    updateDto: UpdateAdminProfileDto,
    file?: Express.Multer.File,
  ) {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { adminId },
      });
      if (!admin) {
        throw new NotFoundException('Admin not found');
      }
      let updateFields = 0;
      if (updateDto.newPassword) {
        if (!updateDto.currentPassword) {
          throw new BadRequestException(
            'Current password is required to change password',
          );
        }
        const isPasswordValid = await bcrypt.compare(
          updateDto.currentPassword,
          admin.password as string,
        );
        if (!isPasswordValid) {
          throw new BadRequestException('Current password is incorrect');
        }
        updateDto.newPassword = await bcrypt.hash(updateDto.newPassword, 10);
        updateFields++;
      }
      let profilePicUrl = admin.profilePic;
      if (profilePicUrl && profilePicUrl.includes('amazonaws.com')) {
        const url = new URL(profilePicUrl);
        profilePicUrl = url.pathname.substring(1);
      }

      if (file) {
        profilePicUrl = await this.s3Service.uploadFile(file);
        updateFields++;
      }
      if (
        updateDto.role ||
        updateDto.accessLevel ||
        updateDto.name ||
        updateDto.email
      ) {
        updateFields++;
      }

      const updateData: any = {
        ...(profilePicUrl && { profilePic: profilePicUrl }),
        ...(updateDto.role && { role: updateDto.role }),
        ...(updateDto.accessLevel && { accessLevel: updateDto.accessLevel }),
        ...(updateDto.newPassword && { password: updateDto.newPassword }),
        ...(updateDto.name && { name: updateDto.name }),
        ...(updateDto.email && { email: updateDto.email }),
      };
      const updatedAdmin = await this.prisma.admin.update({
        where: { adminId },
        data: updateData,
        select: {
          adminId: true,
          name: true,
          email: true,
          profilePic: true,
          role: true,
          accessLevel: true,
          updatedAt: true,
        },
      });
      const signedProfilePicUrl = updatedAdmin.profilePic
        ? await this.s3Service.getSignedUrl(updatedAdmin.profilePic)
        : null;

      const responseData = {
        ...updatedAdmin,
        dbProfilePic: updatedAdmin.profilePic,
        profilePic: signedProfilePicUrl,
      };
      if (updateFields === 1) {
        if (updateDto.newPassword) {
          return {
            message: 'Password updated successfully',
            data: responseData,
          };
        } else if (file) {
          return {
            message: 'Profile image updated successfully',
            data: responseData,
          };
        } else if (updateDto.name) {
          return { message: 'Name updated successfully', data: responseData };
        } else if (updateDto.email) {
          return { message: 'Email updated successfully', data: responseData };
        } else if (updateData.role) {
          return { message: 'Role updated successfully', data: responseData };
        } else if (updateData.accessLevel) {
          return {
            message: 'Access Level updated successfully',
            data: responseData,
          };
        }
      } else if (updateFields > 1) {
        return { message: 'Profile updated successfully', data: responseData };
      }

      return { message: 'No changes made', data: responseData };
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }
  async getAllUsers(
    timePeriod?:
      | 'today'
      | 'weekly'
      | 'monthly'
      | 'yearly'
      | '2years'
      | '3years'
      | '4years'
      | 'custom',
    customStartDate?: Date,
  ) {
    try {
      const startDate = getStartDateByTimePeriod(timePeriod, customStartDate);
      const users = await this.prisma.user.findMany({
        where: {
          isDeleted: false,
          ...(startDate && {
            createdAt: {
              gte: startDate,
            },
          }),
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (users.length === 0) {
        throw new NotFoundException(`No Users Found`);
      }

      const formattedUsers = await Promise.all(
        users.map(async (user) => {
          const signedProfilePicUrl = user.profilePic
            ? await this.s3Service.getSignedUrl(user.profilePic)
            : null;
          return {
            userId: user.userId,
            fullName: `${user.firstName} ${user.lastName || ''}`,
            email: user.email,
            defaultCurrencyName: user.defaultCurrencyName,
            defaultCurrencyCode: user.defaultCurrencyCode,
            defaultLanguage: user.defaultLanguage,
            profilePic: signedProfilePicUrl,
            dbProfilePic: user.profilePic,
            isBlocked: user.isBlocked,
            isDeleted: user.isDeleted,
          };
        }),
      );
      return formattedUsers;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching all users:', error);
      throw new InternalServerErrorException('Failed to fetch users');
    }
  }

  async getUserDetails(userId: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { userId, isDeleted: false },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      const signedProfilePicUrl = user.profilePic
        ? await this.s3Service.getSignedUrl(user.profilePic)
        : null;
      const formattedUser = {
        userId: user.userId,
        fullName: `${user.firstName} ${user.lastName || ''}`,
        email: user.email,
        defaultCurrencyName: user.defaultCurrencyName,
        defaultCurrencyCode: user.defaultCurrencyCode,
        defaultLanguage: user.defaultLanguage,
        profilePic: signedProfilePicUrl,
        dbProfilePic: user.profilePic,
        isBlocked: user.isBlocked,
        isDeleted: user.isDeleted,
      };
      return formattedUser;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching user details:', error);
      throw new Error('Failed to fetch user details');
    }
  }

  async getAllAdmins(invitationStatus?: string) {
    try {
      const whereCondition: any = {
        isDeleted: false,
      };
      if (invitationStatus) {
        whereCondition.invitationStatus = invitationStatus;
      }

      const admins = await this.prisma.admin.findMany({
        where: whereCondition,
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (admins.length === 0) {
        throw new NotFoundException('No admins found');
      }
      const formattedAdmins = admins.map((admin) => ({
        adminId: admin.adminId,
        name: admin.name,
        email: admin.email,
        profilePic: admin.profilePic,
        role: admin.role,
        accessLevel: admin.accessLevel,
        invitationStatus: admin.invitationStatus,
        isBlocked: admin.isBlocked,
        isDeleted: admin.isDeleted,
        isProfileCreated: admin.isProfileCreated,
      }));
      return formattedAdmins;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching all admins:', error);
      throw new InternalServerErrorException('Failed to fetch admins');
    }
  }

  async updateUserStatus(
    userId: number,
    updateData: { isBlocked?: boolean; isDeleted?: boolean },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (updateData.isDeleted && user.isDeleted) {
      throw new BadRequestException('User is already deleted');
    }
    if (updateData.isBlocked && user.isBlocked) {
      throw new BadRequestException('User is already blocked');
    }
    if (updateData.isBlocked === false && !user.isBlocked) {
      throw new BadRequestException('User is not blocked');
    }
    const updatedUser = await this.prisma.user.update({
      where: { userId },
      data: updateData,
      select: {
        userId: true,
        email: true,
        firstName: true,
        lastName: true,
        isBlocked: true,
        isDeleted: true,
        updatedAt: true,
      },
    });
    return updatedUser;
  }
  async getUserCounts(
    timePeriod?:
      | 'today'
      | 'weekly'
      | 'monthly'
      | 'yearly'
      | '2years'
      | '3years'
      | '4years'
      | 'custom',
    customStartDate?: string,
  ): Promise<UserCountResult> {
    const parsedCustomStartDate = customStartDate
      ? new Date(customStartDate)
      : undefined;

    if (parsedCustomStartDate) {
      timePeriod = 'custom';
    }
    const currentWhereClause = { isDeleted: false };

    const [totalUsers, blockedUsers] = await Promise.all([
      this.prisma.user.count({ where: currentWhereClause }),
      this.prisma.user.count({
        where: {
          ...currentWhereClause,
          isBlocked: true,
        },
      }),
    ]);

    const activeUsers = totalUsers - blockedUsers;

    let comparisonData: ComparisonData | null = null;
    let changes: {
      total: ChangeData;
      active: ChangeData;
      blocked: ChangeData;
    } | null = null;

    if (timePeriod) {
      const startDate = getStartDateByTimePeriod(
        timePeriod,
        parsedCustomStartDate,
      );

      if (!startDate) {
        throw new BadRequestException('Invalid time period or custom date');
      }
      const comparisonStartDate = this.getComparisonStartDate(
        startDate,
        timePeriod,
      );

      const currentFilteredWhere = {
        isDeleted: false,
        createdAt: { gte: startDate },
      };

      const comparisonWhereClause = {
        isDeleted: false,
        createdAt: { gte: comparisonStartDate, lt: startDate },
      };

      const [periodTotal, periodBlocked, prevTotal, prevBlocked] =
        await Promise.all([
          this.prisma.user.count({ where: currentFilteredWhere }),
          this.prisma.user.count({
            where: {
              ...currentFilteredWhere,
              isBlocked: true,
            },
          }),
          this.prisma.user.count({ where: comparisonWhereClause }),
          this.prisma.user.count({
            where: {
              ...comparisonWhereClause,
              isBlocked: true,
            },
          }),
        ]);

      const periodActive = periodTotal - periodBlocked;
      const prevActive = prevTotal - prevBlocked;

      comparisonData = {
        totalUsers: prevTotal,
        activeUsers: prevActive,
        blockedUsers: prevBlocked,
        startDate: comparisonStartDate,
        endDate: startDate,
      };

      changes = this.calculateChanges(
        periodTotal,
        periodActive,
        periodBlocked,
        prevTotal,
        prevActive,
        prevBlocked,
      );

      return {
        current: {
          totalUsers,
          activeUsers,
          blockedUsers,
          timePeriod,
          startDate,
        },
        comparison: comparisonData,
        changes,
      };
    }
    return {
      current: {
        totalUsers,
        activeUsers,
        blockedUsers,
        timePeriod: 'all',
        startDate: null,
      },
      comparison: null,
      changes: null,
    };
  }
  private getComparisonStartDate(
    currentStartDate: Date,
    timePeriod: string,
  ): Date {
    const date = new Date(currentStartDate);
    switch (timePeriod) {
      case 'today':
        date.setDate(date.getDate() - 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() - 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() - 1);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() - 1);
        break;
      case '2years':
        date.setFullYear(date.getFullYear() - 2);
        break;
      case '3years':
        date.setFullYear(date.getFullYear() - 3);
        break;
      case '4years':
        date.setFullYear(date.getFullYear() - 4);
        break;
      default:
        const diff = Date.now() - currentStartDate.getTime();
        return new Date(currentStartDate.getTime() - diff);
    }
    return date;
  }

  private calculateChanges(
    currentTotal: number,
    currentActive: number,
    currentBlocked: number,
    previousTotal: number,
    previousActive: number,
    previousBlocked: number,
  ): {
    total: ChangeData;
    active: ChangeData;
    blocked: ChangeData;
  } {
    const calculate = (current: number, previous: number): ChangeData => {
      if (previous === 0) {
        return {
          change: current,
          percentage: current > 0 ? 100 : 0,
          trend: current > 0 ? 'increase' : 'increase',
          text: current > 0 ? `+${current} (100%)` : '0 (0%)',
        };
      }
      const change = current - previous;
      const percentage = (change / previous) * 100;
      const trend =
        change > 0 ? 'increase' : change < 0 ? 'decrease' : 'decrease';

      return {
        change: Math.abs(change),
        percentage: parseFloat(Math.abs(percentage).toFixed(2)),
        trend,
        text: `${change >= 0 ? '+' : '-'}${Math.abs(change)} (${Math.abs(percentage).toFixed(2)}%)`,
      };
    };
    return {
      total: calculate(currentTotal, previousTotal),
      active: calculate(currentActive, previousActive),
      blocked: calculate(currentBlocked, previousBlocked),
    };
  }
}
