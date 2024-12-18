import { Response } from 'express';
import { OpenAIModelProvider } from './model/openai-model-provider';
import { LlamaModelProvider } from './model/llama-model-provider';
import { Logger } from '@nestjs/common';
import {
  ModelProviderType,
  ModelProviderOptions,
  ModelError,
  GenerateMessageParams,
} from './types';
import { ModelProvider } from './model/model-provider';

export interface ChatMessageInput {
  content: string;
}

export interface ChatMessage {
  role: string;
  content: string;
}

export class LLMProvider {
  private readonly logger = new Logger(LLMProvider.name);
  private modelProvider: ModelProvider;
  private readonly options: ModelProviderOptions;
  private initialized: boolean = false;

  constructor(
    modelProviderType: ModelProviderType = 'llama',
    options: ModelProviderOptions = {},
  ) {
    this.options = {
      maxConcurrentRequests: 5,
      maxRetries: 3,
      retryDelay: 1000,
      ...options,
    };

    this.modelProvider = this.createModelProvider(modelProviderType);
  }

  private createModelProvider(type: ModelProviderType): ModelProvider {
    switch (type) {
      case 'openai':
        return new OpenAIModelProvider(this.options);
      case 'llama':
        // TODO: need to support concurrent requests
        return new LlamaModelProvider();
      default:
        throw new Error(`Unsupported model provider type: ${type}`);
    }
  }

  async initialize(): Promise<void> {
    try {
      this.logger.log('Initializing LLM provider...');
      await this.modelProvider.initialize();
      this.initialized = true;
      this.logger.log('LLM provider fully initialized and ready.');
    } catch (error) {
      const modelError = this.normalizeError(error);
      this.logger.error('Failed to initialize LLM provider:', modelError);
      throw modelError;
    }
  }

  async generateStreamingResponse(
    params: GenerateMessageParams,
    res: Response,
  ): Promise<void> {
    this.ensureInitialized();

    try {
      await this.modelProvider.generateStreamingResponse(params, res);
    } catch (error) {
      const modelError = this.normalizeError(error);
      this.logger.error('Error in streaming response:', modelError);

      if (!res.writableEnded) {
        this.sendErrorResponse(res, modelError);
      }
    }
  }

  async getModelTags(res: Response): Promise<void> {
    this.ensureInitialized();

    try {
      await this.modelProvider.getModelTagsResponse(res);
    } catch (error) {
      const modelError = this.normalizeError(error);
      this.logger.error('Error getting model tags:', modelError);

      if (!res.writableEnded) {
        this.sendErrorResponse(res, modelError);
      }
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('LLM provider not initialized. Call initialize() first.');
    }
  }

  private normalizeError(error: any): ModelError {
    if (error instanceof Error) {
      return {
        ...error,
        code: (error as any).code || 'UNKNOWN_ERROR',
        retryable: (error as any).retryable || false,
      };
    }

    return {
      name: 'Error',
      message: String(error),
      code: 'UNKNOWN_ERROR',
      retryable: false,
    };
  }

  private sendErrorResponse(res: Response, error: ModelError): void {
    const errorResponse = {
      error: {
        message: error.message,
        code: error.code,
        details: error.details,
      },
    };

    if (res.headersSent) {
      res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      res.status(500).json(errorResponse);
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getCurrentProvider(): string {
    return this.modelProvider.constructor.name;
  }

  getProviderOptions(): ModelProviderOptions {
    return { ...this.options };
  }
}
