import { Logger } from '@nestjs/common';


export class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableError';
  }
}

export class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

export class RetryHandler {
  private readonly logger = new Logger(RetryHandler.name);
  private static instance: RetryHandler;
  private retryCounts: Map<string, number> = new Map();
  public static getInstance() {
    if (this.instance) return this.instance;
    return new RetryHandler();
  }
  async retryMethod(
    error: Error,
    upperMethod: (...args: any[]) => void,
    args: any[],
  ): Promise<void> {
    const errorName = error.name;
    let retryCount = this.retryCounts.get(errorName) || 0;
    const isRetrying = this.retryCounts.has(errorName);
    let res;
    switch (errorName) {
      case 'RetryableError':
      case 'GeneratedTagError':
      case 'TimeoutError':
        this.logger.warn(
          `Retryable error occurred: ${error.message}. Retrying...`,
        );
        if (!isRetrying) this.retryCounts.set(errorName, 0);
        else
          this.retryCounts.set(errorName, this.retryCounts.get(errorName) + 1);
        while (retryCount < 3) {
          try {
            this.logger.log(`retryCount: ${retryCount}`);
            res = await upperMethod(...args);
          } catch (e) {
            if (e.name === errorName) {
              retryCount++;
              this.retryCounts.set(errorName, retryCount);
              this.logger.warn(
                `Retryable error occurred: ${e.name}: ${e.message}. Retrying attempt ${retryCount}...`,
              );
            } else {
              this.logger.error(
                `Non-retryable error occurred: ${e.name}: ${e.message}. Terminating process.`,
              );
              throw e;
            }
          }
        }
        this.retryCounts.delete(errorName);
        if (res) return res;
        this.logger.error('Max retry attempts reached. Terminating process.');
        throw new Error('Max retry attempts reached');
      default:
        this.logger.error(
          `Non-retryable error occurred: ${error.name}: ${error.message}. Terminating process.`,
        );
        throw error;
    }
  }
}
