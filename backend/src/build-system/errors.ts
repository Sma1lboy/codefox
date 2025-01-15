/**
 * Error thrown when a required file is not found.
 * Typically used in file handling operations to indicate missing files.
 */
export class FileNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileNotFoundError';
  }
}

/**
 * Error thrown when there is an issue modifying a file.
 * Indicates a failure in updating or altering file content.
 */
export class FileModificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileModificationError';
  }
}

/**
 * Error thrown when the model service is unavailable.
 * Used to signal that the underlying model cannot be reached or is down.
 */
export class ModelUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModelUnavailableError';
  }
}

/**
 * Error thrown when parsing a response fails.
 * Indicates that the system could not properly interpret the response data.
 */
export class ResponseParsingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResponseParsingError';
  }
}
/**
 * Error thrown when the expected tags in a response are missing or invalid.
 * Typically occurs during content generation or parsing steps.
 */
export class ResponseTagError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResponseTagError';
  }
}

/**
 * Error thrown when the model service is temporarily unavailable.
 * Indicates transient issues, such as server overload or maintenance downtime.
 */
export class TemporaryServiceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemporaryServiceUnavailableError';
  }
}

/**
 * Error thrown when the rate limit for the model service is exceeded.
 * Used to signal that too many requests have been sent within a given time frame.
 */
export class RateLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}

/**
 * Error thrown when required configuration is missing or invalid.
 * Indicates issues with system setup or missing configuration parameters.
 */
export class MissingConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissingConfigurationError';
  }
}

/**
 * Error thrown when a provided parameter is invalid.
 * Used to signal issues with function arguments or configurations.
 */
export class InvalidParameterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidParameterError';
  }
}

/**
 * Error thrown when a failure occurs while writing to a file.
 * Indicates issues such as insufficient permissions or disk errors.
 */
export class FileWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileWriteError';
  }
}
