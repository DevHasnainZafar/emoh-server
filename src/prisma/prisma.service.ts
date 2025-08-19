import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Database connected');
    } catch (error) {
      this.logger.log('Database connection error:', error.message);
      console.error('Database connection error:', error);
      process.exit(1);
    }
  }
}
