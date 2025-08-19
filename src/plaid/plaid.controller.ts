import { Get, Controller, Post, Req, UseGuards, Body } from '@nestjs/common';
import { PlaidService } from './plaid.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ENDPOINTS } from 'src/constants/Endpoints';
import { ApiBearerAuth, ApiBody, ApiSecurity } from '@nestjs/swagger';

@ApiSecurity('auth-token')
@Controller('plaid')
export class PlaidController {
  constructor(private readonly plaidService: PlaidService) {}
  @Post(ENDPOINTS.PLAID.CREATE_LINK_TOKEN)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createLinkToken(@Req() req) {
    const userId = req.user.userId;
    const linkToken = await this.plaidService.createLinkToken(userId);
    return { link_token: linkToken };
  }
  @Post('get-transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiBearerAuth()@ApiBody({
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', example: 'access-sandbox-123456' },
      },
    },
  })
  async getTransactions(@Req() req,@Body('accessToken') accessToken: string) {
    try {
      const userId = req.user.userId
      const result = await this.plaidService.fetchAndProcessTransactions(userId,accessToken);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get(ENDPOINTS.PLAID.CATEGORIES)
  async getCategories() {
    try {
      const result = await this.plaidService.getCategories();
      return result;
    } catch (error) {
      throw error;
    }
  }
}
