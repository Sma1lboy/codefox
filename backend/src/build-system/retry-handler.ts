import { Logger } from '@nestjs/common';

export class RetryHandler {
  private readonly logger = new Logger(RetryHandler.name);
  private static instance: RetryHandler;
  private retryCounts: Map<string, number> = new Map();
  private readonly MAX_RETRY_COUNT = 3;
  public static getInstance() {
    if (this.instance) return this.instance;
    return new RetryHandler();
  }

  private async addRetryDelay(retryCount: number): Promise<void> {
    const delay = (retryCount + 1) * 1000; // Exponential backoff: 1s, 2s, 3s
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  async retryMethod(
    error: Error,
    upperMethod: (...args: any[]) => Promise<any>,
    args: any[],
  ): Promise<void> {
    const errorName = error.name;
    let retryCount = this.retryCounts.get(errorName) || 0;
    const isRetrying = this.retryCounts.has(errorName);
    let res;
    switch (errorName) {
      case 'ModelTimeoutError':
      case 'TemporaryServiceUnavailableError':
      case 'RateLimitExceededError':
      case 'ResponseParsingError':
        // Optionally add a delay between retries
        this.logger.warn(
          `Retryable error occurred: ${error.message}. Retrying...`,
        );
        if (!isRetrying) this.retryCounts.set(errorName, 0);
        else
          this.retryCounts.set(errorName, this.retryCounts.get(errorName) + 1);
        while (retryCount < this.MAX_RETRY_COUNT) {
          try {
            await this.addRetryDelay(retryCount);
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
