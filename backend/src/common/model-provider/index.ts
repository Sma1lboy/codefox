import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

export interface ModelProviderConfig {
  endpoint: string;
  defaultModel?: string;
}

export interface CustomAsyncIterableIterator<T> extends AsyncIterator<T> {
  [Symbol.asyncIterator](): AsyncIterableIterator<T>;
}

export class ModelProvider {
  private readonly logger = new Logger('ModelProvider');
  private isDone = false;
  private responseSubscription: any;
  private chunkQueue: ChatCompletionChunk[] = [];
  private resolveNextChunk:
    | ((value: IteratorResult<ChatCompletionChunk>) => void)
    | null = null;

  private static instance: ModelProvider | undefined = undefined;

  public static getInstance() {
    if (this.instance) {
      return this.instance;
    }

    return new ModelProvider(new HttpService(), {
      endpoint: 'http://localhost:3001',
    });
  }

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ModelProviderConfig,
  ) {}

  async chatSync(
    input: ChatInput | string,
    model: string,
    chatId?: string,
  ): Promise<string> {
    this.logger.debug('Starting chatSync', { model, chatId });

    this.resetState();

    try {
      const chatStream = this.chat(input, model, chatId);
      let content = '';

      this.logger.debug('Starting to process chat stream');
      for await (const chunk of chatStream) {
        if (chunk.status === StreamStatus.STREAMING) {
          const newContent = chunk.choices
            .map((choice) => choice.delta?.content || '')
            .join('');
          content += newContent;
        }
      }

      return content;
    } catch (error) {
      this.logger.error('Error in chatSync:', error);
      throw error;
    } finally {
      this.cleanup();
      this.logger.debug('ChatSync cleanup completed');
    }
  }

  private resetState() {
    this.logger.debug('Resetting provider state');
    this.isDone = false;
    this.chunkQueue = [];
    this.resolveNextChunk = null;
    if (this.responseSubscription) {
      this.responseSubscription.unsubscribe();
      this.responseSubscription = null;
    }
  }

  chat(
    input: ChatInput | string,
    model: string,
    chatId?: string,
  ): CustomAsyncIterableIterator<ChatCompletionChunk> {
    const chatInput = this.normalizeChatInput(input);
    const selectedModel = model || this.config.defaultModel;

    if (!selectedModel) {
      const error = new Error('No model selected for chat request');
      this.logger.error(error.message);
      throw error;
    }

    const iterator: CustomAsyncIterableIterator<ChatCompletionChunk> = {
      next: () => this.handleNext(),
      return: () => this.handleReturn(),
      throw: (error) => this.handleThrow(error),
      [Symbol.asyncIterator]() {
        return this;
      },
    };

    this.startChat(chatInput, selectedModel, chatId);
    return iterator;
  }

  private normalizeChatInput(input: ChatInput | string): ChatInput {
    return typeof input === 'string' ? { content: input } : input;
  }

  private async handleNext(): Promise<IteratorResult<ChatCompletionChunk>> {
    return new Promise<IteratorResult<ChatCompletionChunk>>((resolve) => {
      if (this.chunkQueue.length > 0) {
        const chunk = this.chunkQueue.shift()!;
        resolve({ done: false, value: chunk });
      } else if (this.isDone) {
        resolve({ done: true, value: undefined });
      } else {
        this.resolveNextChunk = resolve;
      }
    });
  }

  private handleReturn(): Promise<IteratorResult<ChatCompletionChunk>> {
    this.cleanup();
    return Promise.resolve({ done: true, value: undefined });
  }

  private handleThrow(
    error: any,
  ): Promise<IteratorResult<ChatCompletionChunk>> {
    this.cleanup();
    return Promise.reject(error);
  }

  private cleanup() {
    this.logger.debug('Cleaning up provider');
    this.isDone = true;
    if (this.responseSubscription) {
      this.responseSubscription.unsubscribe();
      this.responseSubscription = null;
    }
    this.chunkQueue = [];
    this.resolveNextChunk = null;
  }

  private createRequestPayload(
    input: ChatInput,
    model: string,
    chatId?: string,
  ) {
    return {
      ...input,
      model,
      ...(chatId && { chatId }),
    };
  }

  private createDoneChunk(model: string): ChatCompletionChunk {
    return {
      id: 'done',
      object: 'chat.completion.chunk',
      created: Date.now(),
      model,
      systemFingerprint: null,
      choices: [],
      status: StreamStatus.DONE,
    };
  }

  private handleChunk(chunk: any) {
    if (this.isValidChunk(chunk)) {
      const parsedChunk: ChatCompletionChunk = {
        ...chunk,
        status: StreamStatus.STREAMING,
      };

      if (this.resolveNextChunk) {
        this.resolveNextChunk({ done: false, value: parsedChunk });
        this.resolveNextChunk = null;
      } else {
        this.chunkQueue.push(parsedChunk);
      }
    } else {
      this.logger.warn('Invalid chunk received:', chunk);
    }
  }

  private handleStreamEnd(model: string) {
    this.logger.debug('Stream ended, handling completion');

    if (!this.isDone) {
      const doneChunk = this.createDoneChunk(model);

      if (this.resolveNextChunk) {
        this.resolveNextChunk({ done: false, value: doneChunk });
        this.resolveNextChunk = null;
      } else {
        this.chunkQueue.push(doneChunk);
      }
    }

    Promise.resolve().then(() => {
      this.logger.debug('Setting done state');
      this.isDone = true;
      if (this.resolveNextChunk) {
        this.resolveNextChunk({ done: true, value: undefined });
        this.resolveNextChunk = null;
      }
    });
  }

  private handleStreamError(error: any, model: string) {
    this.logger.error('Stream error occurred:', error);
    const doneChunk = this.createDoneChunk(model);

    if (this.resolveNextChunk) {
      this.logger.debug('Resolving waiting promise with error done chunk');
      this.resolveNextChunk({ done: false, value: doneChunk });
      Promise.resolve().then(() => {
        this.isDone = true;
        if (this.resolveNextChunk) {
          this.resolveNextChunk({ done: true, value: undefined });
          this.resolveNextChunk = null;
        }
      });
    } else {
      this.logger.debug('Queueing error done chunk');
      this.chunkQueue.push(doneChunk);
      Promise.resolve().then(() => {
        this.isDone = true;
      });
    }
  }

  private startChat(input: ChatInput, model: string, chatId?: string) {
    this.resetState();

    const payload = this.createRequestPayload(input, model, chatId);

    this.responseSubscription = this.httpService
      .post(`${this.config.endpoint}/chat/completion`, payload, {
        responseType: 'stream',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .subscribe({
        next: (response) => {
          let buffer = '';

          response.data.on('data', (chunk: Buffer) => {
            buffer += chunk.toString();
            let newlineIndex;

            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
              const line = buffer.slice(0, newlineIndex).trim();
              buffer = buffer.slice(newlineIndex + 1);

              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6);
                if (jsonStr === '[DONE]') {
                  this.logger.debug('Received [DONE] signal');
                  this.handleStreamEnd(model);
                  return;
                }
                try {
                  const parsed = JSON.parse(jsonStr);
                  this.handleChunk(parsed);
                } catch (error) {
                  this.logger.error('Error parsing chunk:', error);
                }
              }
            }
          });

          response.data.on('end', () => {
            this.logger.debug('Response stream ended');
            this.handleStreamEnd(model);
          });
        },
        error: (error) => {
          this.logger.error('Error in chat request:', error);
          this.handleStreamError(error, model);
        },
      });
  }

  private isValidChunk(chunk: any): boolean {
    const isValid =
      chunk &&
      typeof chunk.id === 'string' &&
      typeof chunk.object === 'string' &&
      typeof chunk.created === 'number' &&
      typeof chunk.model === 'string';

    if (!isValid) {
      this.logger.warn('Invalid chunk structure', chunk);
    }

    return isValid;
  }

  public async fetchModelsName() {
    try {
      this.logger.debug('Fetching model tags');
      const response = await this.httpService
        .get(`${this.config.endpoint}/tags`, { responseType: 'json' })
        .toPromise();
      this.logger.debug('Model tags received', response.data);
      return response.data;
    } catch (error) {
      this.logger.error('Error fetching model tags:', error);
      throw new Error('Failed to fetch model tags');
    }
  }
}

export enum StreamStatus {
  STREAMING = 'streaming',
  DONE = 'done',
}

export class ChatCompletionChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  systemFingerprint: string | null;
  choices: ChatCompletionChoice[];
  status: StreamStatus;
}

export interface ChatInput {
  content: string;
  attachments?: Array<{
    type: string;
    content: string | Buffer;
    name?: string;
  }>;
  contextLength?: number;
  temperature?: number;
}

class ChatCompletionDelta {
  content?: string;
}

class ChatCompletionChoice {
  index: number;
  delta: ChatCompletionDelta;
  finishReason: string | null;
}
