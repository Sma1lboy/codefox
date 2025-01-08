export interface ModelChatStreamConfig {
  endpoint: string;
  model?: string;
}
export type CustomAsyncIterableIterator<T> = AsyncIterator<T> & {
  [Symbol.asyncIterator](): AsyncIterableIterator<T>;
};

export interface ModelProviderConfig {
  endpoint: string;
  defaultModel?: string;
}

export interface MessageInterface {
  content: string;
  role: 'user' | 'assistant' | 'system';
}

export interface ChatInput {
  model: string;
  messages: MessageInterface[];
}
