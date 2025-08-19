export type ProcessTransactionResult =
  | {
      success: true;
      message: string;
      transaction: any;
      income?: any;
      expense?: any;
    }
  | {
      success: false;
      message: string;
      transaction?: any;
      error?: string;
    };
