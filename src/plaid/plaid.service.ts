import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
} from 'plaid';
import { ProcessTransactionResult } from 'src/bank/dtos/type-processTransaction';
import { CacheService } from 'src/common/services/cache.service';
import { TransactionsService } from 'src/transactions/transactions.service';
import { getInitialSyncDateRange } from 'src/utils/methods';

@Injectable()
export class PlaidService {
  private plaidClient: PlaidApi;
  private readonly logger = new Logger(PlaidService.name);

  constructor(
    private configService: ConfigService,
    private readonly transactionsService: TransactionsService,
    private readonly cacheService: CacheService,
  ) {
    const configuration = new Configuration({
      basePath:
        PlaidEnvironments[
          this.configService.get<string>(
            'PLAID_ENV',
          ) as keyof typeof PlaidEnvironments
        ],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': this.configService.get<string>('PLAID_CLIENT_ID'),
          'PLAID-SECRET': this.configService.get<string>('PLAID_SECRET'),
        },
      },
    });
    this.plaidClient = new PlaidApi(configuration);
  }
  async createLinkToken(userId: string | number) {
    try {
      this.logger.log(`Creating link token for user ${userId}`);
      const response = await this.plaidClient.linkTokenCreate({
        user: {
          client_user_id: String(userId),
        },
        client_name: 'EMOH',
        products: [Products.Transactions],
        country_codes: [CountryCode.Ca],
        language: 'en',
      });
      this.logger.debug(`Link token created successfully for user ${userId}`);
      return response.data.link_token;
    } catch (error) {
      this.logger.error(
        `Failed to create link token for user ${userId}: ${error.message}`,
        error.stack,
      );
      console.error(
        'Error creating Plaid Link Token:',
        error.response?.data || error.message,
      );
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to create Plaid Link Token',
          error: error.response?.data || error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async exchangePublicToken(publicToken: string) {
    try {
      this.logger.log('Exchanging public token');
      const response = await this.plaidClient.itemPublicTokenExchange({
        public_token: publicToken,
      });
      this.logger.debug('Public token exchanged successfully');
      return response.data.access_token;
    } catch (error) {
      this.logger.error(
        `Failed to exchange public token: ${error.message}`,
        error.stack,
      );
      console.error(
        'Error exchanging public token:',
        error.response?.data || error.message,
      );
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to exchange public token',
          error: error.response?.data || error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getAccountDetails(accessToken: string) {
    try {
      this.logger.log(`Fetching account details with access token`);
      const response = await this.plaidClient.accountsGet({
        access_token: accessToken,
      });
      this.logger.debug(
        `Successfully retrieved ${response.data.accounts.length} accounts`,
      );
      return response.data.accounts;
    } catch (error) {
      this.logger.error(
        `Failed to fetch account details: ${error.message}`,
        error.stack,
        { responseData: error.response?.data },
      );
      console.error(
        'Error fetching account details:',
        error.response?.data || error.message,
      );
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve account details',
          error: error.response?.data || error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getItemDetails(accessToken: string) {
    try {
      this.logger.log(`Fetching item details with access token`);
      const response = await this.plaidClient.itemGet({
        access_token: accessToken,
      });
      this.logger.debug(
        `Successfully retrieved item details: ${response.data.item.item_id}`,
      );
      return response.data.item;
    } catch (error) {
      this.logger.error(
        `Failed to fetch item details: ${error.message}`,
        error.stack,
        { responseData: error.response?.data },
      );
      console.error(
        'Error fetching item details:',
        error.response?.data || error.message,
      );
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve item details',
          error: error.response?.data || error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getInstitutionDetails(institutionId: string) {
    try {
      this.logger.log(`Fetching institution details for ID: ${institutionId}`);
      const response = await this.plaidClient.institutionsGetById({
        institution_id: institutionId,
        country_codes: [CountryCode.Ca],
        options: {
          include_optional_metadata: true,
        },
      });
      this.logger.debug(
        `Successfully retrieved institution: ${response.data.institution.name}`,
      );
      return response.data.institution;
    } catch (error) {
      this.logger.error(
        `Failed to fetch institution details for ID ${institutionId}: ${error.message}`,
        error.stack,
        { responseData: error.response?.data },
      );
      console.error(
        'Error fetching institution details:',
        error.response?.data || error.message,
      );
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve institution details',
          error: error.response?.data || error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getLatestAccountDetails(accessToken: string, accountId: string) {
    try {
      this.logger.log(`Fetching latest details for account ${accountId}`);
      const response = await this.plaidClient.accountsGet({
        access_token: accessToken,
      });

      const account = response.data.accounts.find(
        (acc) => acc.account_id === accountId,
      );
      if (!account) {
        this.logger.warn(`Account not found: ${accountId}`);
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            message: 'Account not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }
      this.logger.debug(
        `Successfully retrieved latest details for account ${accountId}`,
      );
      return account;
    } catch (error) {
      if (
        error instanceof HttpException &&
        error.getStatus() === HttpStatus.NOT_FOUND
      ) {
        throw error;
      }

      this.logger.error(
        `Failed to fetch latest account details for ${accountId}: ${error.message}`,
        error.stack,
        { responseData: error.response?.data },
      );
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve latest account details',
          error: error.response?.data || error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async fetchAndProcessTransactions(
    userId: number,
    accessToken: string,
    lastSyncAt?: Date,
  ) {
    const { startDate, endDate } = getInitialSyncDateRange();
    const formattedLastSyncAt = lastSyncAt?.toISOString().split('T')[0];
    const startDateForSync = formattedLastSyncAt || startDate;
    const maxRetries = 5;
    const retryDelay = 30000;
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        this.logger.log(
          `Fetching transactions for user ${userId} from ${startDateForSync} to ${endDate} (Attempt ${attempt + 1})`,
        );

        const response = await this.plaidClient.transactionsGet({
          access_token: accessToken,
          start_date: startDateForSync,
          end_date: endDate,
        });

        const transactions = response.data.transactions;
        this.logger.debug(
          `Found ${transactions.length} transactions for user ${userId}`,
        );

        if (transactions.length === 0) {
          this.logger.log(
            `No transactions found for user ${userId} in the specified date range.`,
          );
          return {
            message: 'No transactions found in the specified date range',
            results: [],
          };
        }
        const results: ProcessTransactionResult[] = [];
        for (const transaction of transactions) {
          const result = await this.transactionsService.processTransaction(
            userId,
            transaction,
          );
          results.push(result as ProcessTransactionResult);
        }
        this.logger.log(
          `Successfully processed ${results.length} transactions for user ${userId}`,
        );
        return {
          message: 'Transactions processed',
          results,
        };
      } catch (error) {
        const plaidError = error?.response?.data;
        if (
          plaidError?.error_code === 'PRODUCT_NOT_READY' &&
          attempt < maxRetries - 1
        ) {
          this.logger.warn(
            `Transactions not ready yet for user ${userId}. Retrying in ${retryDelay / 1000}s...`,
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          attempt++;
          continue;
        }
        if (plaidError) {
          this.logger.error(
            `Plaid API error while fetching transactions for user ${userId}: ${plaidError.error_type} - ${plaidError.error_code}: ${plaidError.error_message}`,
            JSON.stringify(plaidError, null, 2),
          );
          throw new InternalServerErrorException(
            `Plaid Error: ${plaidError.error_message}`,
          );
        }

        this.logger.error(
          `Unexpected error while fetching transactions for user ${userId}: ${error.message}`,
          error.stack,
        );
        throw new InternalServerErrorException('Failed to fetch transactions');
      }
    }
    throw new InternalServerErrorException(
      `Transactions not ready after ${maxRetries} attempts.`,
    );
  }
  async getTransactions(accessToken: string) {
    const { startDate, endDate } = getInitialSyncDateRange();
    const response = await this.plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
    });
    return response.data.transactions;
  }
  async getCategories() {
    const cacheKey = 'plaid_categories';
    const cacheCategories = this.cacheService.get(cacheKey);
    if (cacheCategories) {
      return cacheCategories;
    }
    const res = await this.plaidClient.categoriesGet({});
    const uniqueCategories = new Map();
    res.data.categories.forEach((category) => {
      category.hierarchy.forEach((name) => {
        if (!uniqueCategories.has(name)) {
          uniqueCategories.set(name, {
            id: category.category_id,
            group: category.group,
          });
        }
      });
    });
    const categories = Array.from(uniqueCategories.entries()).map(
      ([name, { id, group }], index) => ({
        id,
        index: index + 1,
        category: name,
        group,
      }),
    );
    this.cacheService.set(cacheKey, categories, 864000);
    return categories;
  }
}
