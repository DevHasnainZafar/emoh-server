import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class TokenMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) {}
  use(req: Request, res: Response, next: NextFunction) {
    const token = req.headers['auth-token'];
    const secretToken = this.configService.get<string>('SECRET_TOKEN');
    if (!token) {
      throw new UnauthorizedException('Token not found in request header');
    }
    if (token !== secretToken) {
      throw new UnauthorizedException('Invalid token');
    }
    next();
  }
}