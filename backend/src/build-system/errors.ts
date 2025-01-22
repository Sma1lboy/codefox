// error.ts

/**
 * Base class representing retryable errors.
 * Inherits from JavaScript's built-in Error class.
 * Suitable for errors where the system can attempt to retry the operation.
 */
export class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableError';
    Object.setPrototypeOf(this, new.target.prototype); // Fixes the inheritance chain for instanceof checks
  }
}

/**
 * Base class representing non-retryable errors.
 * Inherits from JavaScript's built-in Error class.
 * Suitable for errors where the system should not attempt to retry the operation.
 */
export class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
    Object.setPrototypeOf(this, new.target.prototype); // Fixes the inheritance chain for instanceof checks
  }
}

// Below are specific error classes inheriting from the appropriate base classes

/**
 * Error: File Not Found.
 * Indicates that a required file could not be found during file operations.
 * Non-retryable error.
 */
export class FileNotFoundError extends NonRetryableError {
  constructor(message: string) {
    super(message);
    this.name = 'FileNotFoundError';
  }
}

/**
 * Error: File Modification Failed.
 * Indicates issues encountered while modifying a file, such as insufficient permissions or disk errors.
 * Non-retryable error.
 */
export class FileModificationError extends NonRetryableError {
  constructor(message: string) {
    super(message);
    this.name = 'FileModificationError';
  }
}

/**
 * Error: Model Service Unavailable.
 * Indicates that the underlying model service cannot be reached or is down.
 * Retryable error, typically temporary.
 */
export class ModelUnavailableError extends RetryableError {
  constructor(message: string) {
    super(message);
    this.name = 'ModelUnavailableError';
  }
}

/**
 * Error: Response Parsing Failed.
 * Indicates that the system could not properly parse the response data.
 * Retryable error, possibly due to temporary data format issues.
 */
export class ResponseParsingError extends RetryableError {
  constructor(message: string) {
    super(message);
    this.name = 'ResponseParsingError';
  }
}

/**
 * Error: Response Tag Error.
 * Indicates that expected tags in the response are missing or invalid during content generation or parsing.
 * Non-retryable error.
 */
export class ResponseTagError extends RetryableError {
  constructor(message: string) {
    super(message);
    this.name = 'ResponseTagError';
  }
}

/**
 * Error: Temporary Service Unavailable.
 * Indicates that the service is unavailable due to temporary issues like server overload or maintenance.
 * Retryable error, typically temporary.
 */
export class TemporaryServiceUnavailableError extends RetryableError {
  constructor(message: string) {
    super(message);
    this.name = 'TemporaryServiceUnavailableError';
  }
}

/**
 * Error: Rate Limit Exceeded.
 * Indicates that too many requests have been sent within a given time frame.
 * Retryable error, may require waiting before retrying.
 */
export class RateLimitExceededError extends RetryableError {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}

/**
 * Error: Missing Configuration.
 * Indicates issues with system setup or missing configuration parameters.
 * Non-retryable error, typically requires manual configuration fixes.
 */
export class MissingConfigurationError extends NonRetryableError {
  constructor(message: string) {
    super(message);
    this.name = 'MissingConfigurationError';
  }
}

/**
 * Error: Invalid Parameter.
 * Indicates that a function argument or configuration parameter is invalid.
 * Non-retryable error, typically requires correcting the input parameters.
 */
export class InvalidParameterError extends NonRetryableError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidParameterError';
  }
}

/**
 * Error: File Write Failed.
 * Indicates issues encountered while writing to a file, such as insufficient permissions or disk errors.
 * Non-retryable error.
 */
export class FileWriteError extends NonRetryableError {
  constructor(message: string) {
    super(message);
    this.name = 'FileWriteError';
  }
}
