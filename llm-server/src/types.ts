export interface GenerateMessageParams {
  model: string; // Model to use, e.g., 'gpt-3.5-turbo'
  message: string; // User's message or query
  role?: 'user' | 'system' | 'assistant' | 'tool' | 'function'; // Optional role
}

// types.ts
export type ModelProviderType = 'llama' | 'openai';

export interface ModelProviderOptions {
  maxConcurrentRequests?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface ModelError extends Error {
  code?: string;
  retryable?: boolean;
  details?: any;
}
