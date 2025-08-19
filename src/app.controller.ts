import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiSecurity('auth-token')
  @ApiOperation({ summary: 'Get a hello message' })
  @ApiResponse({ status: 200, description: 'Returns a hello message' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('categories')
  @UseGuards(JwtAuthGuard)
  async getCategories(@Req() req) {
    const userId = req.user?.userId;
    return this.appService.getCategories(userId);
  }
  @Get('favicon.ico')
  handleFavicon() {
    return { statusCode: 204 };
  }
}
