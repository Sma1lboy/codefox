export interface GenerateMessageParams {
  model: string; // Model to use, e.g., 'gpt-3.5-turbo'
  message: string; // User's message or query
  role?: 'user' | 'system' | 'assistant' | 'tool' | 'function'; // Optional role
}
