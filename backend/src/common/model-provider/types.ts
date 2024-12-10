export interface ModelChatStreamConfig {
  endpoint: string;
  model?: string;
}
export type CustomAsyncIterableIterator<T> = AsyncIterator<T> & {
  [Symbol.asyncIterator](): AsyncIterableIterator<T>;
};
