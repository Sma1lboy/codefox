import { Logger } from '@nestjs/common';
import OpenAI from 'openai';
import PQueue from 'p-queue';
import { Response } from 'express';
import { EmbeddingProvider } from './emb-provider';
import { GenerateMessageParams } from '../types';

export class openAIEmbProvider implements EmbeddingProvider {
  private logger = new Logger(openAIEmbProvider.name);

  private openai: OpenAI;
  private requestQueue: PQueue;
  private readonly options: {
    maxConcurrentRequests: number;
    maxRetries: number;
    retryDelay: number;
    queueInterval: number;
    intervalCap: number;
    apiKey: string;
  };

  constructor(options: { apiKey?: string } = {}) {
    this.options = {
      maxConcurrentRequests: 5,
      maxRetries: 3,
      retryDelay: 1000,
      queueInterval: 1000,
      intervalCap: 10,
      apiKey: process.env.OPEN_API_KEY || options.apiKey,
      ...options,
    };

    this.requestQueue = new PQueue({
      concurrency: this.options.maxConcurrentRequests,
      interval: this.options.queueInterval,
      intervalCap: this.options.intervalCap,
    });

    this.requestQueue.on('active', () => {
      this.logger.debug(
        `Queue size: ${this.requestQueue.size}, Pending: ${this.requestQueue.pending}`,
      );
    });
  }

  async initialize(): Promise<void> {
    this.logger.log('Initializing OpenAI model...');
    if (!this.options.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.openai = new OpenAI({
      apiKey: this.options.apiKey,
    });

    this.logger.log(
      `OpenAI model initialized with options: ${JSON.stringify(this.options)}`,
    );
  }

  async generateEmbResponse(
    params: GenerateMessageParams,
    res: Response,
  ): Promise<void> {
    try {
      const embedding = await this.openai.embeddings.create({
        model: params.model,
        input: params.messages[0].content, // FIXME: this should be messages, might cause error
        encoding_format: 'float',
      });
      console.log(embedding.data[0].embedding);
      res.json({
        embedding: embedding.data[0].embedding,
      });
    } catch (error) {
      this.logger.error(
        `Error generating embedding for model ${params.model}:`,
        error,
      );
      res.status(500).json({
        error: error,
      });
    }
  }

  async getEmbList(res: Response): Promise<void> {
    try {
      const models = await this.openai.models.list();
      const embeddingModels = models.data.filter(
        model => (model.object as string) === 'embedding',
      );

      res.json({ models: embeddingModels });
      this.logger.log(`Fetched ${embeddingModels.length} embedding models.`);
    } catch (error) {
      this.logger.error('Error fetching models:', error);
      res
        .status(500)
        .json({ error: 'Error fetching models', message: error.message });
    }
  }
}
