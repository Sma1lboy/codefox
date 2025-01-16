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
  role: string;
  content: string;
}

export class LLMProvider {
  private readonly logger = new Logger(LLMProvider.name);
  private modelProvider: ModelProvider;
  private readonly options: ModelProviderOptions;
  private initialized: boolean = false;

  constructor(
    modelProviderType: ModelProviderType = 'openai',
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
      this.logger.error('Failed to initialize LLM provider:', error);
      throw error;
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
      this.logger.error('Error in streaming response:', error);

      if (!res.writableEnded) {
        this.sendErrorResponse(res, error);
      }
    }
  }

  async getModelTags(res: Response): Promise<void> {
    this.ensureInitialized();

    try {
      await this.modelProvider.getModelTagsResponse(res);
    } catch (error) {
      this.logger.error('Error getting model tags:', error);

      if (!res.writableEnded) {
        this.sendErrorResponse(res, error);
      }
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('LLM provider not initialized. Call initialize() first.');
    }
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
