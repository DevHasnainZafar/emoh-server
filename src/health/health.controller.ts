import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { HealthCheck, MemoryHealthIndicator } from '@nestjs/terminus';
import { CurrencyConversionService } from 'src/common/services/currencyConversion.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private memory: MemoryHealthIndicator,
    private prisma: PrismaService,
    private schedulerRegistry: SchedulerRegistry,
    private currencyService: CurrencyConversionService,
  ) {}

  @Get()
  @HealthCheck()
  async getHealthStatus() {
    const uptime = process.uptime();
    const basicInfo = {
      message: 'Server is healthy 🚀',
      uptime: `${uptime.toFixed(2)} seconds`,
      timestamp: new Date().toISOString(),
      version: 1 || 'unknown',
    };

    const healthChecks: any = {};

    try {
      healthChecks.database = await this.checkDatabase();
      healthChecks.memory = await this.checkMemory();
      healthChecks.currency = await this.checkCurrencyService();
      healthChecks.cronJobs = await this.checkCronJobs();

      return {
        status: 'OK',
        ...basicInfo,
        details: healthChecks,
      };
    } catch (error) {
      const response = {
        status: 'PARTIAL',
        ...basicInfo,
        error: {
          message: error.message,
          stack:
            process.env.NODE_ENV !== 'production' ? error.stack : undefined,
        },
      };

      throw new HttpException(response, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  private async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up', type: 'postgresql' };
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  private async checkMemory() {
    try {
      const heap = await this.memory.checkHeap('memory_heap', 150 * 1024 * 1024);
      const rss = await this.memory.checkRSS('memory_rss', 300 * 1024 * 1024);
      return {
        status: 'up',
        heap: heap.memory_heap.details,
        rss: rss.memory_rss.details,
      };
    } catch (error) {
      throw new Error(`Memory check failed: ${error.message}`);
    }
  }

  private async checkCurrencyService() {
    try {
      const result = await this.currencyService.convertCurrency(1, 'USD', 'EUR');
      if (
        typeof result.convertedAmount !== 'number' ||
        typeof result.exchangeRate !== 'number'
      ) {
        throw new Error('Invalid currency conversion response');
      }
      return {
        status: 'up',
        source: 'exchange-rate-api',
        sampleRate: result.exchangeRate,
      };
    } catch (error) {
      throw new Error(`Currency service failed: ${error.message}`);
    }
  }

  private async checkCronJobs() {
    try {
      const cronJobs = this.schedulerRegistry.getCronJobs();
      const cronStatus = {};

      for (const [key, job] of cronJobs) {
        cronStatus[key] = {
          status: job.running ? 'running' : 'idle',
          nextExecution: job.nextDate()?.toISO() || 'not scheduled',
        };
      }

      return {
        status: Object.keys(cronStatus).length > 0 ? 'up' : 'no jobs',
        jobs: cronStatus,
      };
    } catch (error) {
      throw new Error(`Cron job check failed: ${error.message}`);
    }
  }
}
