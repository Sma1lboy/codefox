// RetryHandler.ts

import { Logger } from '@nestjs/common';
import { RetryableError } from './errors';

/**
 * RetryHandler is a singleton class responsible for managing retry logic
 * for operations that may fail due to transient (temporary) errors.
 */
export class RetryHandler {
  /**
   * Logger instance for logging information, warnings, and errors.
   */
  private readonly logger = new Logger(RetryHandler.name);

  /**
   * Singleton instance of RetryHandler.
   */
  private static instance: RetryHandler;

  /**
   * A map to keep track of retry counts for different error types.
   * The key is the error name, and the value is the number of retries attempted.
   */
  private retryCounts: Map<string, number> = new Map();

  /**
   * Maximum number of retry attempts allowed for a retryable error.
   */
  private readonly MAX_RETRY_COUNT = 3;

  /**
   * Private constructor to enforce the singleton pattern.
   * Prevents direct instantiation of the class.
   */
  private constructor() {}

  /**
   * Retrieves the singleton instance of RetryHandler.
   * If an instance does not exist, it creates one.
   * @returns {RetryHandler} The singleton instance of RetryHandler.
   */
  public static getInstance(): RetryHandler {
    if (!RetryHandler.instance) {
      RetryHandler.instance = new RetryHandler();
    }
    return RetryHandler.instance;
  }

  /**
   * Adds a delay before the next retry attempt.
   * The delay increases linearly based on the current retry count.
   * @param {number} retryCount - The current retry attempt count.
   * @returns {Promise<void>} A promise that resolves after the specified delay.
   */
  private async addRetryDelay(retryCount: number): Promise<void> {
    const delay = (retryCount + 1) * 1000; // Linear backoff: 1s, 2s, 3s
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Attempts to retry a failed method based on the type of error encountered.
   * If the error is retryable, it will retry the method up to MAX_RETRY_COUNT times.
   * If the error is non-retryable or the maximum retry count is reached,
   * it will log the appropriate message and throw an error.
   *
   * @template T - The return type of the upperMethod.
   * @param {Error} error - The error that was thrown by the failed method.
   * @param {(...args: any[]) => Promise<T>} upperMethod - The method to retry.
   * @param {any[]} args - The arguments to pass to the upperMethod.
   * @returns {Promise<T>} The result of the successfully retried method.
   * @throws {Error} If the maximum retry attempts are reached or a non-retryable error occurs.
   */
  public async retryMethod<T>(
    error: Error,
    upperMethod: (...args: any[]) => Promise<T>,
    args: any[],
  ): Promise<T> {
    // Check if the error is an instance of RetryableError
    if (error instanceof RetryableError) {
      const errorName = error.name;
      let retryCount = this.retryCounts.get(errorName) || 0;

      // Log a warning indicating a retryable error has occurred
      this.logger.warn(
        `Retryable error occurred: ${error.message}. Retrying...`,
      );

      // Attempt to retry the method while the retry count is below the maximum
      while (retryCount < this.MAX_RETRY_COUNT) {
        try {
          // Add a delay before retrying
          await this.addRetryDelay(retryCount);

          // Log the current retry attempt
          this.logger.log(`Retry attempt ${retryCount + 1} for ${errorName}`);

          // Attempt to execute the upperMethod with the provided arguments
          const result = await upperMethod(...args);

          // If successful, remove the retry count for this error and return the result
          this.retryCounts.delete(errorName);
          return result;
        } catch (e) {
          // If the caught error is the same retryable error, increment the retry count
          if (e instanceof RetryableError && e.name === errorName) {
            retryCount++;
            this.retryCounts.set(errorName, retryCount);

            // Log a warning for the failed retry attempt
            this.logger.warn(
              `Retryable error occurred: ${e.name}: ${e.message}. Retrying attempt ${retryCount}...`,
            );
          } else {
            // If the error is non-retryable, log an error and rethrow the exception
            this.logger.error(
              `Non-retryable error occurred: ${e.name}: ${e.message}. Terminating process.`,
            );
            throw e;
          }
        }
      }

      // After exhausting all retry attempts, remove the retry count and log an error
      this.retryCounts.delete(errorName);
      this.logger.error('Max retry attempts reached. Terminating process.');
      throw new Error('Max retry attempts reached');
    } else {
      // If the error is non-retryable, log an error and rethrow the exception
      this.logger.error(
        `Non-retryable error occurred: ${error.name}: ${error.message}. Terminating process.`,
      );
      throw error;
    }
  }
}
