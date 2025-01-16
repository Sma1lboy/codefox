import { Response } from 'express';
import OpenAI from 'openai';
import { Logger } from '@nestjs/common';
import { systemPrompts } from '../prompt/systemPrompt';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import PQueue from 'p-queue';
import { GenerateMessageParams } from '../types';
import { ConfigLoader } from 'codefox-common';
import { ModelProvider } from './model-provider';

export interface OpenAIProviderOptions {
  maxConcurrentRequests?: number;
  maxRetries?: number;
  retryDelay?: number;
  queueInterval?: number;
  intervalCap?: number;
  apiKey?: string;
  systemPromptKey?: string;
}

interface QueuedRequest {
  params: GenerateMessageParams;
  res: Response;
  retries: number;
}

export class OpenAIModelProvider implements ModelProvider {
  private readonly logger = new Logger(OpenAIModelProvider.name);
  private requestQueue: PQueue;
  private readonly options: Required<OpenAIProviderOptions>;
  private openAIcontainer: Map<string, OpenAI>;

  constructor(options: OpenAIProviderOptions = {}) {
    this.options = {
      maxConcurrentRequests: 5,
      maxRetries: 3,
      retryDelay: 1000,
      queueInterval: 1000,
      intervalCap: 10,
      apiKey: process.env.OPENAI_API_KEY,
      systemPromptKey: 'codefox-basic',
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
    this.openAIcontainer = new Map();
    const config = ConfigLoader.getInstance();
    const chatModels = config.getAllChatModelConfigs();
    const apiModels = chatModels.filter(model =>
      model.endpoint?.includes('openai.com'),
    );

    if (!apiModels || apiModels.length === 0) {
      throw new Error('No OpenAI models found in the configuration.');
    }

    apiModels.forEach(model => {
      if (this.openAIcontainer.has(model.model)) return;
      const openai = new OpenAI({
        apiKey: model.token ? model.token : this.options.apiKey,
      });
      this.openAIcontainer.set(model.model, openai);
    });
  }

  private getInstance(modelName: string): OpenAI {
    const config = ConfigLoader.getInstance();
    const chatModels = config.getAllChatModelConfigs();
    const modelConfig = chatModels.find(model => model.model === modelName);

    if (!modelConfig) {
      throw new Error(
        `Model "${modelName}" is not included in the configuration. Please add it under the "chat" section in ".codefox/config.json".`,
      );
    }

    if (!modelConfig.endpoint?.includes('openai.com')) {
      throw new Error(
        `Model "${modelName}" is not an OpenAI model. Please check the configuration.`,
      );
    }

    if (this.openAIcontainer.has(modelName)) {
      return this.openAIcontainer.get(modelName);
    }

    throw new Error(`Model "${modelName}" is not initialized. Please check.`);
  }

  async generateStreamingResponse(
    params: GenerateMessageParams,
    res: Response,
  ): Promise<void> {
    const request: QueuedRequest = {
      params,
      res,
      retries: 0,
    };

    await this.requestQueue.add(() => this.processRequest(request));
  }

  private async processRequest(request: QueuedRequest): Promise<void> {
    const { params, res, retries } = request;
    const { model, messages } = params as {
      model: string;
      messages: ChatCompletionMessageParam[];
    };

    this.logger.log(`Processing request (attempt ${retries + 1})`);
    const startTime = Date.now();

    try {
      const openai = this.getInstance(model);
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      const systemPrompt =
        systemPrompts[this.options.systemPromptKey]?.systemPrompt || '';
      const allMessages: ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...messages,
      ];

      const stream = await openai.chat.completions.create({
        model,
        messages: allMessages,
        stream: true,
      });

      let chunkCount = 0;
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          chunkCount++;
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      }

      const endTime = Date.now();
      this.logger.log(
        `Response completed. Chunks: ${chunkCount}, Time: ${endTime - startTime}ms`,
      );
      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const isServerError = errorMessage.includes('server had an error');
      const isRateLimit = errorMessage.includes('rate_limit');
      const isAuthError = errorMessage.includes('authentication');

      if ((isServerError || isRateLimit) && retries < this.options.maxRetries) {
        this.logger.warn(
          `Request failed (attempt ${retries + 1}) with error: ${errorMessage}. Retrying...`,
        );

        const baseDelay = isServerError ? 5000 : this.options.retryDelay;
        const delay = Math.min(baseDelay * Math.pow(2, retries), 30000);

        await new Promise(resolve => setTimeout(resolve, delay));

        request.retries++;
        await this.requestQueue.add(() => this.processRequest(request));
        return;
      }

      const errorResponse = {
        error: {
          message: errorMessage,
          code: isServerError
            ? 'SERVER_ERROR'
            : isRateLimit
              ? 'RATE_LIMIT'
              : isAuthError
                ? 'AUTH_ERROR'
                : 'UNKNOWN_ERROR',
          retryable: isServerError || isRateLimit,
          retries: retries,
        },
      };

      this.logger.error('Error during OpenAI response generation:', {
        error: errorResponse,
        params: {
          model,
          messageLength: messages.length,
        },
      });

      res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    }
  }

  private shouldRetry(error: any): boolean {
    const retryableErrors = [
      'rate_limit_exceeded',
      'timeout',
      'service_unavailable',
    ];

    if (error instanceof Error) {
      return retryableErrors.some(e => error.message.includes(e));
    }

    return false;
  }

  async getModelTagsResponse(res: Response): Promise<void> {
    await this.requestQueue.add(async () => {
      this.logger.log('Fetching available models from OpenAI...');
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      try {
        const openai = this.getInstance('gpt-3.5-turbo');
        const startTime = Date.now();
        const models = await openai.models.list();
        const response = {
          models: models,
        };
        const endTime = Date.now();

        this.logger.log(
          `Models fetched: ${models.data.length}, Time: ${endTime - startTime}ms`,
        );

        res.write(JSON.stringify(response));
        res.end();
      } catch (error) {
        this.logger.error('Error fetching models:', error);
        const errorResponse = {
          error: {
            message: 'Failed to fetch models',
            code: 'FETCH_MODELS_ERROR',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
        };
        res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
      }
    });
  }

  getOptions(): Readonly<OpenAIProviderOptions> {
    return { ...this.options };
  }

  getQueueStatus() {
    return {
      size: this.requestQueue.size,
      pending: this.requestQueue.pending,
      isPaused: this.requestQueue.isPaused,
    };
  }
}
