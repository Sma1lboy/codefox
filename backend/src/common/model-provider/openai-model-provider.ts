import {
  ChatInput,
  CustomAsyncIterableIterator,
  IModelProvider,
} from './types';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';
import { Logger } from '@nestjs/common';
import { Stream } from 'openai/streaming';
import { ChatCompletionChunk as OpenAIChatCompletionChunk } from 'openai/resources/chat';
import { ChatCompletionChunk } from 'src/chat/chat.model';
import PQueue from 'p-queue-es5';
import { ConfigLoader, ModelConfig } from 'codefox-common';
export class OpenAIModelProvider implements IModelProvider {
  private static instance: OpenAIModelProvider;
  private openai: OpenAI;
  private readonly logger = new Logger('OpenAIModelProvider');
  private queues: Map<string, PQueue> = new Map();
  private configLoader: ConfigLoader;

  private constructor() {
    this.openai = new OpenAI({
      apiKey: '',
      baseURL: 'http://localhost:3001',
    });

    this.configLoader = ConfigLoader.getInstance();
    this.initializeQueues();
  }

  private getQueueKey(config: ModelConfig): string {
    return `${config.endpoint}:${config.token}:${config.model}`;
  }

  private initializeQueues(): void {
    const chatModels = this.configLoader.getAllChatModelConfigs();

    for (const model of chatModels) {
      if (!model.endpoint || !model.token) continue;

      const key = this.getQueueKey(model);
      const concurrency = model.rps ? Math.floor(model.rps / 2) : 5;

      const queue = new PQueue({
        concurrency,
        timeout: 30000, // 30 second timeout
      });

      // Log queue events for monitoring
      queue.on('active', () => {
        this.logger.debug(
          `Queue ${model.model} - Size: ${queue.size}, Pending: ${queue.pending}`,
        );
      });

      this.queues.set(key, queue);
      this.logger.debug(
        `Initialized queue for model ${model.model} with concurrency ${concurrency}`,
      );
    }
  }

  private getQueueForModel(model: string): PQueue {
    const modelConfig = this.configLoader
      .getAllChatModelConfigs()
      .find((config) => config.model === model || config.alias === model);

    if (!modelConfig || !modelConfig.endpoint || !modelConfig.token) {
      throw new Error(`No configuration found for model: ${model}`);
    }

    const key = this.getQueueKey(modelConfig);
    const queue = this.queues.get(key);

    if (!queue) {
      throw new Error(`No queue found for model: ${model}`);
    }

    return queue;
  }

  public static getInstance(): OpenAIModelProvider {
    if (!OpenAIModelProvider.instance) {
      OpenAIModelProvider.instance = new OpenAIModelProvider();
    }
    return OpenAIModelProvider.instance;
  }

  async chatSync(input: ChatInput): Promise<string> {
    try {
      const queue = this.getQueueForModel(input.model);
      const completion = await queue.add(async () => {
        const result = await this.openai.chat.completions.create({
          messages: input.messages,
          model: input.model,
          stream: false,
        });
        if (!result) throw new Error('No completion result received');
        return result;
      });

      if (!completion) throw new Error('Queue operation failed');
      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error('Error in chatSync:', error);
      throw error;
    }
  }

  chat(
    input: ChatInput,
    model: string,
  ): CustomAsyncIterableIterator<ChatCompletionChunk> {
    let stream: Stream<OpenAIChatCompletionChunk> | null = null;
    const modelName = model || input.model;
    const queue = this.getQueueForModel(modelName);

    const createStream = async () => {
      if (!stream) {
        const result = await queue.add(async () => {
          const streamResult = await this.openai.chat.completions.create({
            messages: input.messages,
            model: modelName,
            stream: true,
          });
          if (!streamResult) throw new Error('No stream result received');
          return streamResult;
        });

        if (!result) throw new Error('Queue operation failed');
        stream = result;
      }
      return stream;
    };

    const iterator: CustomAsyncIterableIterator<ChatCompletionChunk> = {
      async next() {
        try {
          const currentStream = await createStream();
          const chunk = await currentStream[Symbol.asyncIterator]().next();
          return {
            done: chunk.done,
            value: chunk.value as ChatCompletionChunk,
          };
        } catch (error) {
          stream = null;
          throw error;
        }
      },
      async return() {
        stream = null;
        return { done: true, value: undefined };
      },
      async throw(error) {
        stream = null;
        throw error;
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };

    return iterator;
  }

  async fetchModelsName(): Promise<string[]> {
    try {
      const models = await this.openai.models.list();
      return models.data.map((model) => model.id);
    } catch (error) {
      this.logger.error('Error fetching models:', error);
      throw error;
    }
  }

  async batchChatSync(requests: ChatInput[]): Promise<string[]> {
    try {
      // Group requests by model to use the same queue
      const requestsByModel = new Map<string, ChatInput[]>();

      for (const request of requests) {
        const existing = requestsByModel.get(request.model) || [];
        existing.push(request);
        requestsByModel.set(request.model, existing);
      }

      // Process each model's requests with its queue
      const results = await Promise.all(
        Array.from(requestsByModel.entries()).map(
          async ([modelName, modelRequests]) => {
            const queue = this.getQueueForModel(modelName);

            // Process all requests for this model through its queue
            const modelResults = await Promise.all(
              modelRequests.map(async (request) => {
                const result = await queue.add<string>(async () => {
                  const completion = await this.openai.chat.completions.create({
                    messages: request.messages,
                    model: request.model,
                    stream: false,
                  });
                  if (!completion || !completion.choices[0]?.message?.content) {
                    throw new Error('No completion result received');
                  }
                  return completion.choices[0].message.content;
                });

                if (!result) {
                  throw new Error('Queue operation failed');
                }
                return result;
              }),
            );

            return modelResults;
          },
        ),
      );

      // Flatten results back into a single array
      return results.flat();
    } catch (error) {
      this.logger.error('Error in batchChatSync:', error);
      throw error;
    }
  }

  getAllActivePromises(): Promise<string>[] {
    // OpenAI SDK handles its own request management
    return [];
  }
}
