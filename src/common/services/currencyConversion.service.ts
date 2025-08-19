import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { CacheService } from './cache.service';

@Injectable()
export class CurrencyConversionService {
  constructor(private readonly cacheService: CacheService) {}

  async convertCurrency(
    accountAmount: number,
    accountCurrencyCode: string,
    userDefaultCurrencyCode: string,
  ): Promise<{ convertedAmount: number; exchangeRate: number }> {
    if (accountCurrencyCode === userDefaultCurrencyCode) {
      return { convertedAmount: accountAmount, exchangeRate: 1 };
    }
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    const apiBaseUrl = process.env.EXCHANGE_RATE_API_URL;
    if (!apiKey || !apiBaseUrl) {
      throw new NotFoundException(
        'Missing API configuration in environment variables',
      );
    }
    const cacheKey = `exchange_rate_${accountCurrencyCode}_to_${userDefaultCurrencyCode}`;
    const cachedRate = this.cacheService.get(cacheKey) as
      | { exchangeRate: number }
      | undefined;

    if (cachedRate) {
      if (cachedRate.exchangeRate === 1) {
        return { convertedAmount: accountAmount, exchangeRate: 1 };
      }
      const convertedAmount = accountAmount * cachedRate.exchangeRate;
      return { convertedAmount, exchangeRate: cachedRate.exchangeRate };
    }
    const apiUrl = `${apiBaseUrl}${apiKey}/latest/${accountCurrencyCode}`;
    try {
      const response = await axios.get(apiUrl);
      const rates = response.data.conversion_rates;
      if (!rates || !rates[userDefaultCurrencyCode]) {
        throw new Error(
          `Exchange rate for ${userDefaultCurrencyCode} not found`,
        );
      }
      let exchangeRate = rates[userDefaultCurrencyCode];
      if (
        exchangeRate === 1 ||
        accountCurrencyCode === userDefaultCurrencyCode
      ) {
        exchangeRate = 1;
      }

      this.cacheService.set(cacheKey, { exchangeRate }, 28800);
      const convertedAmount = accountAmount * exchangeRate;
      return { convertedAmount, exchangeRate };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        if (axiosError.response?.status === 404) {
          throw new NotFoundException(
            'Exchange rate API returned 404 Not Found',
          );
        }
        throw new BadGatewayException(
          `Exchange rate API error: ${axiosError.message}`,
        );
      }
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Unexpected error converting currency:', error);
      throw new InternalServerErrorException('Currency conversion failed');
    }
  }

  invalidateCache(
    accountCurrencyCode: string,
    userDefaultCurrencyCode: string,
  ) {
    const cacheKey = `exchange_rate_${accountCurrencyCode}_to_${userDefaultCurrencyCode}`;
    this.cacheService.delete(cacheKey);
  }
}
