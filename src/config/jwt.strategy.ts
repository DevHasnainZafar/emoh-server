import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService,
    private readonly prisma:PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'secretKey',
    });
  }

  async validate(payload: any) {
    const {sub:userId,accessLevel} = payload
    const isAdmin = accessLevel === "PARTIAL" || accessLevel === "FULL";
    if(isAdmin){
      const admin = await this.prisma.admin.findUnique({
        where: { adminId: userId }, 
        });
      if (!admin) {
        throw new UnauthorizedException('Admin not found');
      }
       return { userId: payload.sub, name:payload.name };
    }else{
     const user = await this.prisma.user.findUnique({
      where: { userId: payload.sub },
    });
     if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if(user.isDeleted){
      throw new UnauthorizedException("Your account has been deleted")
    }
    if (user.isBlocked) {
      throw new ForbiddenException('Your account has been blocked');
    }
    return { userId: payload.sub, email: payload.email };
    } 
  }
}