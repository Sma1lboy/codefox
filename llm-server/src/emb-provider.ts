import { Response } from 'express';
import { openAIEmbProvider } from './embedding/openai-embedding-provider';
import { LlamaModelProvider } from './model/llama-model-provider'; // 如果支持Llama模型
import { Logger } from '@nestjs/common';
import {
  ModelProviderType,
  ModelProviderOptions,
  ModelError,
  GenerateMessageParams,
} from './types';
import { ModelProvider } from './model/model-provider';
import { EmbeddingProvider } from './embedding/emb-provider';

export interface EmbeddingInput {
  content: string;
}

export interface Embedding {
  model: string;
  embedding: number[];
}

export class EmbeddingModelProvider {
  private readonly logger = new Logger(EmbeddingModelProvider.name);
  private modelProvider: EmbeddingProvider;
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

  private createModelProvider(type: ModelProviderType): EmbeddingProvider {
    switch (type) {
      case 'openai':
        return new openAIEmbProvider({ apiKey: process.env.OPEN_API_KEY });
      // case 'llama':
      //
      //   // return new LlamaModelProvider();
      default:
        throw new Error(`Unsupported embedding model provider type: ${type}`);
    }
  }

  async initialize(): Promise<void> {
    try {
      this.logger.log('Initializing embedding provider...');
      await this.modelProvider.initialize();
      this.initialized = true;
      this.logger.log('Embedding provider fully initialized and ready.');
    } catch (error) {
      const modelError = this.normalizeError(error);
      this.logger.error('Failed to initialize embedding provider:', modelError);
      throw modelError;
    }
  }

  async generateEmbeddingResponse(
    params: GenerateMessageParams,
    res: Response,
  ): Promise<void> {
    this.ensureInitialized();

    try {
      await this.modelProvider.generateEmbResponse(params, res);
    } catch (error) {
      const modelError = this.normalizeError(error);
      this.logger.error('Error in generating embedding response:', modelError);

      if (!res.writableEnded) {
        this.sendErrorResponse(res, modelError);
      }
    }
  }

  async getEmbeddingModels(res: Response): Promise<void> {
    this.ensureInitialized();

    try {
      await this.modelProvider.getEmbList(res);
    } catch (error) {
      const modelError = this.normalizeError(error);
      this.logger.error('Error getting embedding models:', modelError);

      if (!res.writableEnded) {
        this.sendErrorResponse(res, modelError);
      }
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        'Embedding provider not initialized. Call initialize() first.',
      );
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
