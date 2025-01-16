import { Logger } from '@nestjs/common';
import OpenAI from 'openai';
import PQueue from 'p-queue';
import {
  ModelApiMessage,
  ModelApiResponse,
  ModelApiStreamChunk,
  ModelConfig,
} from 'codefox-common';
import { ModelInstance, ModelError } from '../types';

export class RemoteOpenAIModelEngine implements ModelInstance {
  private readonly logger = new Logger(RemoteOpenAIModelEngine.name);
  private client: OpenAI;
  private queue: PQueue;

  constructor(private readonly config: ModelConfig) {
    this.client = new OpenAI({
      apiKey: config.token,
      baseURL: config.endpoint,
    });

    // Initialize queue with 30 RPS limit
    this.queue = new PQueue({
      intervalCap: config.rps, // 30 requests
      interval: 1000, // per 1000ms (1 second)
      carryoverConcurrencyCount: true, // Carry over pending tasks
      timeout: 30000, // 30 second timeout
    });

    // Log queue events for monitoring
    this.queue.on('active', () => {
      this.logger.debug(
        `Queue size: ${this.queue.size}, Pending: ${this.queue.pending}`,
      );
    });

    this.queue.on('error', error => {
      this.logger.error('Queue error:', error);
    });
  }

  private createModelError(error: unknown): ModelError {
    const modelError = new Error('Model error occurred') as ModelError;

    if (error instanceof OpenAI.APIError) {
      modelError.message = error.message;
      modelError.code = String(error.status) || 'OPENAI_API_ERROR';
      modelError.retryable = [429, 503, 502].includes(error.status);
      modelError.details = error.error;
    } else if (error instanceof Error) {
      modelError.message = error.message;
      modelError.code = 'REMOTE_MODEL_ERROR';
      modelError.retryable = false;
      modelError.details = error;
    } else {
      modelError.message = 'Unknown error occurred';
      modelError.code = 'UNKNOWN_ERROR';
      modelError.retryable = false;
      modelError.details = error;
    }

    return modelError;
  }

  async chat(messages: ModelApiMessage[]): Promise<ModelApiResponse> {
    try {
      const result = await this.queue.add<ModelApiResponse>(async () => {
        return await this.client.chat.completions.create({
          model: this.config.model,
          messages,
        });
      });

      if (!result) {
        throw new Error('Queue is closed');
      }

      return result;
    } catch (error) {
      const modelError = this.createModelError(error);
      this.logger.error('Error in chat:', modelError);
      throw modelError;
    }
  }

  async *chatStream(
    messages: ModelApiMessage[],
  ): AsyncIterableIterator<ModelApiStreamChunk> {
    try {
      // Queue the stream creation
      const stream = await this.queue.add<AsyncIterable<ModelApiStreamChunk>>(
        async () => {
          return await this.client.chat.completions.create({
            model: this.config.model,
            messages,
            stream: true,
          });
        },
      );

      if (!stream) {
        throw new Error('Queue is closed');
      }

      // Process stream chunks outside the queue since they're part of the same request
      for await (const chunk of stream) {
        yield chunk;
      }
    } catch (error) {
      const modelError = this.createModelError(error);
      this.logger.error('Error in chatStream:', modelError);
      throw modelError;
    }
  }
}
