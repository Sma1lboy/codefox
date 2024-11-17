import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ChatCompletionChunk, StreamStatus } from 'src/chat/chat.model';

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
      // TODO: adding into env
      endpoint: 'http://localhost:3001',
    });
  }

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ModelProviderConfig,
  ) {}

  chat(
    input: ChatInput | string,
    model: string,
    chatId?: string,
  ): CustomAsyncIterableIterator<ChatCompletionChunk> {
    const chatInput = this.normalizeChatInput(input);
    const selectedModel = model || this.config.defaultModel || undefined;
    if (selectedModel === undefined) {
      this.logger.error('No model selected for chat request');
      return;
    }

    this.logger.debug(
      `Chat request - Model: ${selectedModel}, ChatId: ${chatId || 'N/A'}`,
      { input: chatInput },
    );

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
    if (typeof input === 'string') {
      return { content: input };
    }
    return input;
  }

  private handleNext(): Promise<IteratorResult<ChatCompletionChunk>> {
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

  private cleanup() {
    this.isDone = true;
    if (this.responseSubscription) {
      this.responseSubscription.unsubscribe();
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
    this.logger.debug('Stream ended');
    if (!this.isDone) {
      const doneChunk = this.createDoneChunk(model);
      if (this.resolveNextChunk) {
        this.resolveNextChunk({ done: false, value: doneChunk });
        this.resolveNextChunk = null;
      } else {
        this.chunkQueue.push(doneChunk);
      }
    }

    setTimeout(() => {
      this.isDone = true;
      if (this.resolveNextChunk) {
        this.resolveNextChunk({ done: true, value: undefined });
        this.resolveNextChunk = null;
      }
    }, 0);
  }

  private handleStreamError(error: any, model: string) {
    this.logger.error('Error in stream:', error);
    const doneChunk = this.createDoneChunk(model);

    if (this.resolveNextChunk) {
      this.resolveNextChunk({ done: false, value: doneChunk });
      setTimeout(() => {
        this.isDone = true;
        this.resolveNextChunk?.({ done: true, value: undefined });
        this.resolveNextChunk = null;
      }, 0);
    } else {
      this.chunkQueue.push(doneChunk);
      setTimeout(() => {
        this.isDone = true;
      }, 0);
    }
  }

  async chunkSync(chatStream: AsyncIterableIterator<any>): Promise<string> {
    let aggregatedContent = '';
    for await (const chunk of chatStream) {
      if (chunk.status === StreamStatus.STREAMING) {
        aggregatedContent += chunk.choices
          .map((choice) => choice.delta?.content || '')
          .join('');
      }
    }
    this.logger.log('Aggregated content from chat stream:', aggregatedContent);
    return aggregatedContent;
  }

  private startChat(input: ChatInput, model: string, chatId?: string) {
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
          response.data.on('end', () => this.handleStreamEnd(model));
        },
        error: (error) => this.handleStreamError(error, model),
      });
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

  public async fetchModelsName() {
    try {
      this.logger.debug('Requesting model tags from /tags endpoint.');

      // Make a GET request to /tags
      const response = await this.httpService
        .get(`${this.config.endpoint}/tags`, { responseType: 'json' })
        .toPromise();
      this.logger.debug('Model tags received:', response.data);
      return response.data;
    } catch (error) {
      this.logger.error('Error fetching model tags:', error);
      throw new Error('Failed to fetch model tags');
    }
  }
}
