/**
 * Error thrown when a required file is not found.
 */
export class FileNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileNotFoundError';
  }
}

/**
 * Error thrown when there is an issue modifying a file.
 */
export class FileModificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileModificationError';
  }
}

/**
 * Error thrown when parsing a response fails.
 */
export class ResponseParsingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResponseParsingError';
  }
}

export class ResponseTagError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResponseTagError';
  }
}

export class ModelTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModelTimeoutError';
  }
}

export class TemporaryServiceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemporaryServiceUnavailableError';
  }
}

export class RateLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}

export class MissingConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissingConfigurationError';
  }
}

export class InvalidParameterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidParameterError';
  }
}

export class FileWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileWriteError';
  }
}

export class ParsingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParsingError';
  }
}
