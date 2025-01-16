import { Logger } from '@nestjs/common';
import OpenAI from 'openai';
import {
  ModelApiMessage,
  ModelApiResponse,
  ModelApiStreamChunk,
} from 'codefox-common';
import { ModelInstance, ModelError } from '../types';

export class RemoteOpenAIModelEngine implements ModelInstance {
  private readonly logger = new Logger(RemoteOpenAIModelEngine.name);
  private client: OpenAI;

  constructor(
    endpoint: string,
    token: string,
    private readonly modelName: string,
  ) {
    this.client = new OpenAI({
      apiKey: token,
      baseURL: endpoint,
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
      return await this.client.chat.completions.create({
        model: this.modelName,
        messages,
      });
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
      const stream = await this.client.chat.completions.create({
        model: this.modelName,
        messages,
        stream: true,
      });

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
