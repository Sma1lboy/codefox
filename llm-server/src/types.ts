import { Response } from 'express';
import {
  ModelApiMessage,
  ModelApiRequest,
  ModelApiResponse,
  ModelApiStreamChunk,
} from 'codefox-common';

export type MessageInput = ModelApiRequest;
export type GenerateMessageParams = ModelApiRequest;

export type ModelProviderType = 'llama' | 'openai' | 'remote';

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

export interface ModelInstance {
  chat(messages: ModelApiMessage[]): Promise<ModelApiResponse>;
  chatStream(
    messages: ModelApiMessage[],
  ): AsyncIterableIterator<ModelApiStreamChunk>;
}

export interface ModelMap {
  [key: string]: ModelInstance;
}

export interface ModelEngine {
  initialize(): Promise<void>;
  generateStreamingResponse(
    params: GenerateMessageParams,
    res: Response,
  ): Promise<void>;
  generateResponse(params: GenerateMessageParams): Promise<string>;
  createModelInstance(modelName: string): ModelInstance;
  isInitialized(): boolean;
}
