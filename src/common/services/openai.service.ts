import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { categories } from 'src/utils/categories';

@Injectable()
export class OpenAIService {
  private openai: OpenAI;
  private readonly possibleCategories: string[];

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
    this.possibleCategories = categories.map((c) => c.category);
  }

  async categorizeTransaction(transactionDetails: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a financial categorization assistant. Analyze the transaction details and map it to one of these exact categories:
            ${this.possibleCategories.join(', ')}.
            If none match well, return exactly "Uncategorized / Miscellaneous".
            Only return the exact category name, nothing else.`,
          },
          {
            role: 'user',
            content: `Categorize this transaction:
            ${transactionDetails}
            Return only the exact matching category name from the list provided.`,
          },
        ],
        temperature: 0.2,
        max_tokens: 30,
      });

      const category = response.choices[0]?.message?.content?.trim();
      if (!category) {
        return 'Uncategorized / Miscellaneous';
      }
      return (
        this.possibleCategories.find((c) => c === category) ??
        'Uncategorized / Miscellaneous'
      );
    } catch (error) {
      console.error('OpenAI categorization error:', error);
      return 'Uncategorized / Miscellaneous';
    }
  }
}
