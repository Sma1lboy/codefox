import { ChatCompletionChunk as OpenAIChatCompletionChunk } from 'openai/resources';
import { ChatCompletionChunk } from 'src/chat/chat.model';

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

export interface IModelProvider {
  /**
   * Synchronous chat method that returns a complete response
   * @param input The chat input containing messages and model
   * @returns Promise resolving to the complete response string
   */
  chatSync(input: ChatInput): Promise<string>;

  /**
   * Stream-based chat method that returns an async iterator
   * @param input The chat input containing messages
   * @param model The model to use for chat
   * @param chatId Optional chat ID for conversation tracking
   * @returns CustomAsyncIterableIterator for streaming responses
   */
  chat(
    input: ChatInput,
    model: string,
  ): CustomAsyncIterableIterator<ChatCompletionChunk>;

  /**
   * Get all active chat promises
   * @returns Array of active chat promises
   */
  getAllActivePromises(): Promise<string>[];

  /**
   * Fetch available model names
   * @returns Promise resolving to array of model names
   */
  fetchModelsName(): Promise<string[]>;
}
