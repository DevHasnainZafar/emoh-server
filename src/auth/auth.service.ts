import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserResponseDto } from './dtos/user-response.dto';
import { CreateProfileDto } from './dtos/createProfile.dto';
import { S3Service } from 'src/s3/s3.service';
import { generateOtp } from 'src/utils/methods';
import { UpdateProfileDto } from './dtos/updateProfile.dto';
import { CurrencyConversionService } from 'src/common/services/currencyConversion.service';
import { sendOtpEmail } from 'src/emailUtils/sendOtpEmail';
import { RequestDeleteOtpDto, VerifyDeleteOtpDto } from './dtos/auth-dtos';
import { sendDeleteOtpEmail } from 'src/emailUtils/sendDeleteOtpEmail';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly currencyConversionService: CurrencyConversionService,
  ) {}

  async register(email: string) {
    try {
      const lowerCaseEmail = email.toLowerCase();
      const existingUser = await this.prisma.user.findUnique({
        where: { email: lowerCaseEmail },
      });
      if(existingUser?.isBlocked){
          throw new BadRequestException('Your account is blocked. Please contact support.');
      }
       if (existingUser?.isDeleted) {
      throw new BadRequestException('Your account has been deleted. Please contact support.');
    }
     if (existingUser?.password) {
      throw new BadRequestException('User already registered');
    }
      const generatedOtp = generateOtp();
      const regOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
       if (!existingUser) {
      await this.prisma.user.create({
        data: {
          email: lowerCaseEmail,
          regOtp: generatedOtp,
          regOTPExpiry,
        },
      });
    } else {
      await this.prisma.user.update({
        where: { email: lowerCaseEmail },
        data: {
          regOtp: generatedOtp,
          regOTPExpiry,
          regOtpVerified: false,
        },
      });
    }
      await sendOtpEmail(email, generatedOtp);
      return { message: 'OTP send to your email' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  async verifyOtp(otp: number, email: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        regOtp: otp,
        regOTPExpiry: { gte: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException(
        'Invalid OTP, email mismatch, or OTP expired',
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: { email },
      data: {
        regOtpVerified: true,
        regOtp: null,
        regOTPExpiry: null,
      },
    });
    const payload = { email: updatedUser.email, sub: updatedUser.userId };
    const accessToken = this.jwtService.sign(payload);
    return {
      userId: updatedUser.userId,
      accessToken,
    };
  }

  async setPassword(
    userId: number,
    email: string,
    password: string,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { userId, email },
    });
    if (!user) {
      throw new BadRequestException('Invalid user ID or email');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const updatedUser = await this.prisma.user.update({
      where: { userId },
      data: {
        password: hashedPassword,
        regOtp: null,
        regOTPExpiry: null,
      },
      select: {
        userId: true,
        firstName: true,
        lastName: true,
        email: true,
        defaultCurrencyName: true,
        defaultCurrencyCode: true,
        defaultLanguage: true,
        profilePic: true,
        isProfileCreated: true,
      },
    });

    return updatedUser;
  }

  async createProfile(
    userId: number,
    createProfileDto: CreateProfileDto,
    file: Express.Multer.File,
  ) {
    const profilePicUrl = file ? await this.s3Service.uploadFile(file) : null;
    const userInput = {
      ...createProfileDto,
      profilePic: profilePicUrl,
      isProfileCreated: true,
    };
    return this.prisma.user.update({
      where: { userId },
      data: userInput,
    });
  }

  async resendOTP(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { regOtp: true, regOTPExpiry: true, password: true },
    });
    if (user?.password !== null) {
      throw new BadRequestException('User already registered');
    }
    if (user?.regOtp && user.regOTPExpiry && new Date() < user.regOTPExpiry) {
      return { message: 'OTP is still valid. Please check your email.' };
    }
    const generatedOtp = generateOtp();
    const regOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await sendOtpEmail(email, generatedOtp);
    await this.prisma.user.update({
      where: { email },
      data: { regOtp: generatedOtp, regOTPExpiry },
    });
    return { message: 'A new OTP has been sent to your email.' };
  }

  async login(email: string, password: string): Promise<UserResponseDto> {
    try {
      const lowerCaseEmail = email.toLowerCase();
      const user = await this.prisma.user.findUnique({
        where: { email: lowerCaseEmail },
      });

      if (!user) {
        throw new NotFoundException('This Email does not exist');
      }

      if (user.isDeleted) {
        throw new BadRequestException(
          'Your account has been deleted',
        );
      }

      if (user.isBlocked) {
        throw new BadRequestException(
          'Your account has been blocked by the admin.',
        );
      }

      if (user.isGoogle) {
        throw new BadRequestException('Please continue with Google login');
      }

      const isMatch = await bcrypt.compare(password, user.password as string);
      if (!isMatch) {
        throw new BadRequestException('Invalid Password');
      }

      const payload = { username: user.email, sub: user.userId };
      const accessToken = this.jwtService.sign(payload);

      return {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        defaultCurrencyName: user.defaultCurrencyName,
        defaultCurrencyCode: user.defaultCurrencyCode,
        defaultLanguage: user.defaultLanguage,
        isProfileCreated: user.isProfileCreated,
        profilePic: user.profilePic,
        accessToken,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('Error during login:', error);
      throw new InternalServerErrorException('Failed to login');
    }
  }
  async validateOAuthLogin(
    email: string,
    firstName: string,
    lastName: string,
  ): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      const newUser = await this.prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          password: '',
          regOtpVerified: true,
          isGoogle: true,
        },
      });
      const payload = { username: newUser.email, sub: newUser.userId };
      return this.jwtService.sign(payload);
    }
    const payload = { username: user.email, sub: user.userId };
    return this.jwtService.sign(payload);
  }

  async getProfile(userId: number): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        firstName: true,
        lastName: true,
        email: true,
        defaultCurrencyName: true,
        defaultCurrencyCode: true,
        defaultLanguage: true,
        profilePic: true,
        isProfileCreated: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
  async updateProfile(
    userId: number,
    updateProfileDto: UpdateProfileDto,
    file: Express.Multer.File,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let profilePicUrl = user.profilePic;
    if (file) {
      profilePicUrl = await this.s3Service.uploadFile(file);
    }

    const userInput = {
      ...updateProfileDto,
      profilePic: profilePicUrl,
    };
    const isCurrencyUpdated =
      updateProfileDto.defaultCurrencyCode &&
      updateProfileDto.defaultCurrencyCode !== user.defaultCurrencyCode;
    const updatedUser = await this.prisma.user.update({
      where: { userId },
      data: userInput,
    });
    if (!isCurrencyUpdated) return updatedUser;
    const newCurrencyCode = updateProfileDto.defaultCurrencyCode;
    if (!newCurrencyCode) {
      throw new BadRequestException('Default currency code is required');
    }
    const banks = await this.prisma.bank.findMany({
      where: { fkUserId: userId },
    });
    for (const bank of banks) {
      const { convertedAmount, exchangeRate } =
        await this.currencyConversionService.convertCurrency(
          bank.accountAmount,
          bank.accountCurrencyCode,
          newCurrencyCode,
        );
      await this.prisma.bank.update({
        where: { bankId: bank.bankId },
        data: {
          accountAmountInDefaultCurrency: convertedAmount,
          exchangeRateForBaseCurrency: exchangeRate,
        },
      });
    }
    const budgetLogs = await this.prisma.budgetLog.findMany({
      where: { fkUserId: userId },
    });
    for (const log of budgetLogs) {
      const { convertedAmount } =
        await this.currencyConversionService.convertCurrency(
          log.budgetAmountInGivenCurrency,
          log.budgetAmountCurrency,
          newCurrencyCode,
        );
      await this.prisma.budgetLog.update({
        where: { logId: log.logId },
        data: {
          budgetAmountInBaseCurrency: convertedAmount,
          baseCurrency: newCurrencyCode,
        },
      });
    }
    const budgets = await this.prisma.budget.findMany({
      where: { fkUserId: userId },
    });
    for (const budget of budgets) {
      const { convertedAmount } =
        await this.currencyConversionService.convertCurrency(
          budget.budgetAmountInGivenCurrency,
          budget.budgetAmountCurrency,
          newCurrencyCode,
        );
      await this.prisma.budget.update({
        where: { budgetId: budget.budgetId },
        data: {
          budgetAmountInBaseCurrency: convertedAmount,
          baseCurrency: newCurrencyCode,
        },
      });
    }
    const incomes = await this.prisma.income.findMany({
      where: { fkUserId: userId },
    });
    for (const income of incomes) {
      const { convertedAmount } =
        await this.currencyConversionService.convertCurrency(
          income.incomeAmountInGivenCurrency,
          income.incomeAmountCurrency,
          newCurrencyCode,
        );
      await this.prisma.income.update({
        where: { incomeId: income.incomeId },
        data: {
          incomeAmountInBaseCurrency: convertedAmount,
          baseCurrency: newCurrencyCode,
        },
      });
    }
    const expenses = await this.prisma.expense.findMany({
      where: { fkUserId: userId },
    });
    for (const expense of expenses) {
      const { convertedAmount } =
        await this.currencyConversionService.convertCurrency(
          expense.expenseAmountInGivenCurrency,
          expense.expenseAmountCurrency,
          newCurrencyCode,
        );
      await this.prisma.expense.update({
        where: { expenseId: expense.expenseId },
        data: {
          expenseAmountInBaseCurrency: convertedAmount,
          baseCurrency: newCurrencyCode,
        },
      });
    }
    const transactions = await this.prisma.transactions.findMany({
      where: { fkUserId: userId },
    });
    for (const transaction of transactions) {
      const { convertedAmount, exchangeRate } =
        await this.currencyConversionService.convertCurrency(
          transaction.amountInGivenCurrency,
          transaction.amountCurrency,
          newCurrencyCode,
        );
      await this.prisma.transactions.update({
        where: { transactionId: transaction.transactionId },
        data: {
          amountInBaseCurrency: convertedAmount,
          exchangeRateForBaseCurrency: exchangeRate,
          BaseCurrency: newCurrencyCode,
        },
      });
    }

    const bankHistories = await this.prisma.bankHistory.findMany({
      where: { fkUserId: userId },
    });
    for (const bankHistory of bankHistories) {
      const { convertedAmount, exchangeRate } =
        await this.currencyConversionService.convertCurrency(
          bankHistory.accountAmount,
          bankHistory.accountCurrencyCode,
          newCurrencyCode,
        );
      await this.prisma.bankHistory.update({
        where: { bankHistoryId: bankHistory.bankHistoryId },
        data: {
          accountAmountInDefaultCurrency: convertedAmount,
          exchangeRateForBaseCurrency: exchangeRate,
        },
      });
    }
    const financialItems = await this.prisma.financialItems.findMany({
      where: { fkUserId: userId },
    });
    for (const item of financialItems) {
      const { convertedAmount: defaultConverted, exchangeRate: defaultRate } =
        await this.currencyConversionService.convertCurrency(
          item.givenAmount,
          item.givenCurrencyCode,
          newCurrencyCode,
        );

      const { convertedAmount: cadConverted, exchangeRate: cadRate } =
        await this.currencyConversionService.convertCurrency(
          item.givenAmount,
          item.givenCurrencyCode,
          'CAD',
        );

      await this.prisma.financialItems.update({
        where: { itemId: item.itemId },
        data: {
          amountInDefaultCurrency: defaultConverted,
          defaultCurrency: newCurrencyCode,
          exchangeRateForBaseCurrency: defaultRate,
          amountInCADCurrency: cadConverted,
          exchangeRateForCAD: cadRate,
        },
      });
    }
    const netWorthHistories = await this.prisma.netWorthHistory.findMany({
      where: { fkUserId: userId },
    });
    for (const history of netWorthHistories) {
      const { convertedAmount } =
        await this.currencyConversionService.convertCurrency(
          history.netWorthInCAD,
          'CAD',
          newCurrencyCode,
        );

      await this.prisma.netWorthHistory.update({
        where: { netWorthHistoryId: history.netWorthHistoryId },
        data: {
          netWorthInDefaultCurrency: convertedAmount,
          defaultCurrency: newCurrencyCode,
        },
      });
    }

    return updatedUser;
  }

  async forgotPassword(email: string) {
    try {
      const lowerCaseEmail = email.toLowerCase();
      const user = await this.prisma.user.findUnique({
        where: { email: lowerCaseEmail },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.isDeleted) {
        throw new BadRequestException(
          'Your account has been removed by the admin.',
        );
      }

      if (user.isBlocked) {
        throw new BadRequestException(
          'Your account has been blocked by the admin.',
        );
      }

      if (user?.regOtp && user.regOTPExpiry && new Date() < user.regOTPExpiry) {
        return { message: 'OTP is still valid. Please check your email.' };
      }

      const generatedOtp = generateOtp();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      await this.prisma.user.update({
        where: { email: lowerCaseEmail },
        data: {
          regOtp: generatedOtp,
          regOTPExpiry: otpExpiry,
          regOtpVerified: false,
        },
      });

      await sendOtpEmail(email, generatedOtp);

      return { message: 'OTP sent to your email for password reset' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  async deleteAccount(userId: number) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: {
          userId,
          isDeleted: false,
        },
      });
      if (!existingUser) {
        throw new NotFoundException('User not found or already deleted');
      }
      await this.prisma.$transaction(async (prisma) => {
        await prisma.user.update({
          where: { userId },
          data: { isDeleted: true },
        });
        await prisma.bank.updateMany({
          where: { fkUserId: userId },
          data: { isArchived: true },
        });
        await prisma.bankHistory.updateMany({
          where: { fkUserId: userId },
          data: { isArchived: true },
        });
        await prisma.budget.updateMany({
          where: { fkUserId: userId },
          data: { isDeleted: true },
        });
        await prisma.budgetLog.updateMany({
          where: { fkUserId: userId },
          data: { isActive: false },
        });
        await prisma.expense.updateMany({
          where: { fkUserId: userId },
          data: { isDeleted: true },
        });
        await prisma.financialItems.updateMany({
          where: { fkUserId: userId },
          data: { isDeleted: true },
        });
        await prisma.income.updateMany({
          where: { fkUserId: userId },
          data: { isDeleted: true },
        });
        await prisma.transactions.updateMany({
          where: { fkUserId: userId },
          data: { isDeleted: true },
        });
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }


  async requestDeleteOtp(requestDeleteOtpDto:RequestDeleteOtpDto) {
    const {email} = requestDeleteOtpDto
  const lowerEmail = email.toLowerCase();
  const user = await this.prisma.user.findUnique({ where: { email: lowerEmail } });

  if (!user || user.isDeleted) {
    throw new NotFoundException('User not found or already deleted');
  }

  const otp = generateOtp();
  const expiry = new Date(Date.now() + 10 * 60 * 1000);

  await this.prisma.user.update({
    where: { email: lowerEmail },
    data: {
      regOtp: otp,
      regOTPExpiry: expiry,
    },
  });

  await sendDeleteOtpEmail(email, otp);
  return { message: 'OTP sent to your email to confirm account deletion' };
}

async verifyDeleteOtpAndDelete(verifyDeleteOtpDto:VerifyDeleteOtpDto) {
  const {email,otp} = verifyDeleteOtpDto
  const lowerEmail = email.toLowerCase();
  const user = await this.prisma.user.findFirst({
    where: {
      email: lowerEmail,
      regOtp: otp,
      regOTPExpiry: { gte: new Date() },
    },
  });
  if (!user) {
    throw new BadRequestException('Invalid OTP or OTP expired');
  }
  await this.deleteAccount(user.userId);
  return { message: 'Account deleted successfully' };
}
}
