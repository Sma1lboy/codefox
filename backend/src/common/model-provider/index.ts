import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Subject, Subscription } from 'rxjs';
import { MessageRole } from 'src/chat/message.model';
import { ChatInput, ModelProviderConfig } from './types';


export interface CustomAsyncIterableIterator<T> extends AsyncIterator<T> {
  [Symbol.asyncIterator](): AsyncIterableIterator<T>;
}

export class ModelProvider {
  private readonly logger = new Logger('ModelProvider');
  private isDone = false;
  private responseSubscription: Subscription | null = null;
  private chunkQueue: ChatCompletionChunk[] = [];
  private resolveNextChunk:
    | ((value: IteratorResult<ChatCompletionChunk>) => void)
    | null = null;

  // Track active requests
  private activeRequests = new Map<
    string,
    {
      startTime: number;
      subscription: Subscription;
      stream: Subject<any>;
      promise: Promise<string>;
    }
  >();

  // Concurrent request management
  private concurrentLimit = 3;
  private currentRequests = 0;

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

  /**
   * Synchronous chat method that returns a complete response
   */
  async chatSync(
    input: ChatInput,
  ): Promise<string> {
    while (this.currentRequests >= this.concurrentLimit) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.currentRequests++;

    this.logger.debug(
      `Starting request ${requestId}. Active: ${this.currentRequests}/${this.concurrentLimit}`,
    );


    let resolvePromise: (value: string) => void;
    let rejectPromise: (error: any) => void;

    const promise = new Promise<string>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    const stream = new Subject<any>();
    let content = '';
    let isCompleted = false;

    const subscription = stream.subscribe({
      next: (chunk) => {
        if (chunk?.choices?.[0]?.delta?.content) {
          content += chunk.choices[0].delta.content;
        }
      },
      error: (error) => {
        if (!isCompleted) {
          isCompleted = true;
          this.cleanupRequest(requestId);
          rejectPromise(error);
        }
      },
      complete: () => {
        if (!isCompleted) {
          isCompleted = true;
          this.cleanupRequest(requestId);
          resolvePromise(content);
        }
      },
    });

    this.activeRequests.set(requestId, {
      startTime: Date.now(),
      subscription,
      stream,
      promise,
    });

    this.processRequest(input, requestId, stream);
    return promise;
  }

  /**
   * Stream-based chat method that returns an async iterator
   */
  chat(
    input: ChatInput | string,
    model: string,
    chatId?: string,
  ): CustomAsyncIterableIterator<ChatCompletionChunk> {
    const chatInput = this.normalizeChatInput(input, model);
    const selectedModel = model || this.config.defaultModel;

    if (!selectedModel) {
      throw new Error('No model selected for chat request');
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

  /**
   * Get all active promises for concurrent request management
   */
  public getAllActivePromises(): Promise<string>[] {
    return Array.from(this.activeRequests.values()).map(
      (request) => request.promise,
    );
  }

  private async processRequest(
    input: ChatInput,
    requestId: string,
    stream: Subject<any>,
  ) {
    let isCompleted = false;

    try {
      const response = await this.httpService
        .post(
          `${this.config.endpoint}/chat/completion`,
          input,
          {
            responseType: 'stream',
            headers: { 'Content-Type': 'application/json' },
          },
        )
        .toPromise();

      let buffer = '';

      response.data.on('data', (chunk: Buffer) => {
        if (isCompleted) return;

        buffer += chunk.toString();

        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            if (jsonStr === '[DONE]') {
              if (!isCompleted) {
                isCompleted = true;
                this.logger.debug(
                  `Request ${requestId} received [DONE] signal`,
                );
                stream.complete();
              }
              return;
            }
            try {
              const parsed = JSON.parse(jsonStr);
              if (!isCompleted) {
                stream.next(parsed);
              }
            } catch (error) {
              this.logger.error(
                `Error parsing chunk for request ${requestId}:`,
                error,
              );
            }
          }
        }
      });

      response.data.on('end', () => {
        if (!isCompleted) {
          isCompleted = true;
          stream.complete();
        }
      });

      response.data.on('error', (error) => {
        if (!isCompleted) {
          isCompleted = true;
          stream.error(error);
        }
      });
    } catch (error) {
      if (!isCompleted) {
        isCompleted = true;
        stream.error(error);
      }
    }
  }

  private startChat(input: ChatInput, model: string, chatId?: string) {
    this.resetState();
    const payload = this.createRequestPayload(input, model, chatId);

    this.responseSubscription = this.httpService
      .post(`${this.config.endpoint}/chat/completion`, payload, {
        responseType: 'stream',
        headers: { 'Content-Type': 'application/json' },
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
            this.handleStreamEnd(model);
          });
        },
        error: (error) => {
          this.handleStreamError(error, model);
        },
      });
  }

  private async handleNext(): Promise<IteratorResult<ChatCompletionChunk>> {
    return new Promise<IteratorResult<ChatCompletionChunk>>((resolve) => {
      if (this.chunkQueue.length > 0) {
        resolve({ done: false, value: this.chunkQueue.shift()! });
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
    }
  }

  private handleStreamEnd(model: string) {
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
      this.isDone = true;
      if (this.resolveNextChunk) {
        this.resolveNextChunk({ done: true, value: undefined });
        this.resolveNextChunk = null;
      }
    });
  }

  private handleStreamError(error: any, model: string) {
    const doneChunk = this.createDoneChunk(model);
    if (this.resolveNextChunk) {
      this.resolveNextChunk({ done: false, value: doneChunk });
      this.isDone = true;
    } else {
      this.chunkQueue.push(doneChunk);
      this.isDone = true;
    }
  }

  private cleanupRequest(requestId: string) {
    const request = this.activeRequests.get(requestId);
    if (request) {
      try {
        const duration = Date.now() - request.startTime;
        this.logger.debug(
          `Completed request ${requestId}. Duration: ${duration}ms`,
        );

        if (request.subscription && !request.subscription.closed) {
          request.subscription.unsubscribe();
        }

        this.activeRequests.delete(requestId);
        this.currentRequests--;

        this.logger.debug(
          `Remaining active requests: ${this.currentRequests}/${this.concurrentLimit}`,
        );
      } catch (error) {
        this.logger.error(
          `Error during cleanup of request ${requestId}:`,
          error,
        );
      }
    }
  }

  private cleanup() {
    this.isDone = true;
    if (this.responseSubscription) {
      this.responseSubscription.unsubscribe();
      this.responseSubscription = null;
    }
    this.chunkQueue = [];
    this.resolveNextChunk = null;
  }

  private resetState() {
    this.isDone = false;
    this.chunkQueue = [];
    this.resolveNextChunk = null;
    if (this.responseSubscription) {
      this.responseSubscription.unsubscribe();
      this.responseSubscription = null;
    }
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

  private isValidChunk(chunk: any): boolean {
    return (
      chunk &&
      typeof chunk.id === 'string' &&
      typeof chunk.object === 'string' &&
      typeof chunk.created === 'number' &&
      typeof chunk.model === 'string'
    );
  }

  private normalizeChatInput(input: ChatInput | string, model: string): ChatInput {
    return typeof input === 'string' ? { model, messages:[{
      content: input,
      role: MessageRole.User,
    }] } : input;
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

class ChatCompletionDelta {
  content?: string;
}

class ChatCompletionChoice {
  index: number;
  delta: ChatCompletionDelta;
  finishReason: string | null;
}
