import {
  ChatInput,
  CustomAsyncIterableIterator,
  IModelProvider,
} from './types';
import OpenAI from 'openai';
import { Logger } from '@nestjs/common';
import { Stream } from 'openai/streaming';
import { ChatCompletionChunk as OpenAIChatCompletionChunk } from 'openai/resources/chat';
import { ChatCompletionChunk } from 'src/chat/chat.model';
export class OpenAIModelProvider implements IModelProvider {
  private static instance: OpenAIModelProvider;
  private openai: OpenAI;
  private readonly logger = new Logger('OpenAIModelProvider');

  private constructor() {
    this.logger.log('guseee' + process.env.OPENAI_BASE_URL);
    this.openai = new OpenAI({
      apiKey: '',
      baseURL: process.env.OPENAI_BASE_URL,
    });
  }

  public static getInstance(): OpenAIModelProvider {
    if (!OpenAIModelProvider.instance) {
      OpenAIModelProvider.instance = new OpenAIModelProvider();
    }
    return OpenAIModelProvider.instance;
  }

  async chatSync(input: ChatInput): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        messages: input.messages,
        model: input.model,
        stream: false,
      });

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

    const createStream = async () => {
      if (!stream) {
        stream = await this.openai.chat.completions.create({
          messages: input.messages,
          model: model || input.model,
          stream: true,
        });
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

  getAllActivePromises(): Promise<string>[] {
    // OpenAI SDK handles its own request management
    return [];
  }
}
