import { Logger, Module } from '@nestjs/common';
import { ChatMessageInput, LLMProvider } from './llm-provider';
import express, { Express, Request, Response } from 'express';
import { GenerateMessageParams } from './types';

export class App {
  private readonly logger = new Logger(App.name);
  private app: Express;
  private readonly PORT: number;
  private llmProvider: LLMProvider;
  // private embProvider: EmbeddingModelProvider;

  constructor(llmProvider: LLMProvider) {
    this.app = express();
    this.app.use(express.json());
    this.PORT = parseInt(process.env.PORT || '3001', 10);
    this.llmProvider = llmProvider;
    // this.embProvider = embProvider;
    this.logger.log(`App initialized with PORT: ${this.PORT}`);
  }

  setupRoutes(): void {
    this.logger.log('Setting up routes...');
    this.app.post('/chat/completion', this.handleChatRequest.bind(this));
    // this.app.post('/embedding', this.handleEmbRequest.bind(this));
    this.app.get('/tags', this.handleModelTagsRequest.bind(this));
    this.logger.log('Routes set up successfully.');
  }

  // private async handleEmbRequest(req: Request, res: Response): Promise<void> {
  //   this.logger.log('Received embedding request.');
  //   try {
  //     this.logger.debug(JSON.stringify(req.body));
  //     const { content, model } = req.body as ChatMessageInput & {
  //       model: string;
  //     };
  //     if (!content || !model) {
  //       res.status(400).json({ error: 'Content and model are required' });
  //     }

  //     this.logger.log(`Received chat request for model: ${model}`);
  //     const params: GenerateMessageParams = {
  //       model: model || 'text-embedding-ada-002',
  //       messages: [{ content, role: 'system' }],
  //     };

  //     this.logger.debug(`Request content: "${content}"`);
  //     res.setHeader('Content-Type', 'application/json');
  //     res.setHeader('Cache-Control', 'no-cache');
  //     this.logger.debug('Response headers set for streaming.');
  //     await this.embProvider.generateEmbeddingResponse(params, res);
  //   } catch (error) {
  //     this.logger.error('Error in chat endpoint:', error);
  //     res.status(500).json({ error: 'Internal server error' });
  //   }
  // }

  private async handleChatRequest(req: Request, res: Response): Promise<void> {
    this.logger.log('Received chat request.');
    try {
      const input = req.body as GenerateMessageParams;
      const model = input.model;
      this.logger.log(`Received chat request for model: ${model}`);

      this.logger.debug(`Request messages: "${input.messages}"`);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      this.logger.debug('Response headers set for streaming.');
      await this.llmProvider.generateStreamingResponse(input, res);
    } catch (error) {
      this.logger.error('Error in chat endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async handleModelTagsRequest(
    req: Request,
    res: Response,
  ): Promise<void> {
    this.logger.log('Received chat request.');
    try {
      this.logger.debug(JSON.stringify(req.body));
      const { content } = req.body as ChatMessageInput;
      this.logger.debug(`Request content: "${content}"`);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      this.logger.debug('Response headers set for streaming.');
      await this.llmProvider.getModelTags(res);
    } catch (error) {
      this.logger.error('Error in chat endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async start(): Promise<void> {
    this.setupRoutes();
    this.app.listen(this.PORT, () => {
      this.logger.log(`Server running on port ${this.PORT}`);
    });
  }
}

async function main() {
  const logger = new Logger('Main');
  try {
    const llmProvider = new LLMProvider('openai');
    await llmProvider.initialize();

    // const embProvider = new EmbeddingModelProvider('openai');
    // await embProvider.initialize();
    const app = new App(llmProvider);
    await app.start();
  } catch (error) {
    logger.error('Failed to start the application:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Failed to start the application:', error);
  process.exit(1);
});
