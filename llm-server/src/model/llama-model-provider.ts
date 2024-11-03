import { Response } from 'express';
import path from 'path';
import {
  getLlama,
  LlamaChatSession,
  LlamaContext,
  LlamaModel,
} from 'node-llama-cpp';
import { ModelProvider } from './model-provider.js';
import { Logger } from '@nestjs/common';
import { GenerateMessageParams } from '../type/GenerateMessage';

//TODO: using protocol class
export class LlamaModelProvider extends ModelProvider {
  private readonly logger = new Logger(LlamaModelProvider.name);
  private model: LlamaModel;
  private context: LlamaContext;

  async initialize(): Promise<void> {
    this.logger.log('Initializing Llama model...');
    const llama = await getLlama();
    const modelPath = path.join(
      process.cwd(),
      'models',
      'LLAMA-3.2-1B-OpenHermes2.5.IQ4_XS.gguf',
    );
    this.logger.log(`Loading model from path: ${modelPath}`);
    this.model = await llama.loadModel({
      modelPath: modelPath,
    });
    this.logger.log('Model loaded successfully.');
    this.context = await this.model.createContext();
    this.logger.log('Llama model initialized and context created.');
  }

  async generateStreamingResponse(
    { model, message, role = 'user' }: GenerateMessageParams,
    res: Response,
  ): Promise<void> {
    this.logger.log('Generating streaming response with Llama...');
    const session = new LlamaChatSession({
      contextSequence: this.context.getSequence(),
    });
    this.logger.log('LlamaChatSession created.');
    let chunkCount = 0;
    const startTime = Date.now();
    try {
      await session.prompt(message, {
        onTextChunk: chunk => {
          chunkCount++;
          this.logger.debug(`Sending chunk #${chunkCount}: "${chunk}"`);
          res.write(
            `data: ${JSON.stringify({ role: 'bot', content: chunk })}\n\n`,
          );
        },
      });
      const endTime = Date.now();
      this.logger.log(
        `Response generation completed. Total chunks: ${chunkCount}`,
      );
      this.logger.log(`Generation time: ${endTime - startTime}ms`);
      res.write(`data: [DONE]\n\n`);
      res.end();
      this.logger.log('Response stream ended.');
    } catch (error) {
      this.logger.error('Error during response generation:', error);
      res.write(`data: ${JSON.stringify({ error: 'Generation failed' })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    }
  }

  async getModelTagsResponse(res: Response): Promise<void> {
    this.logger.log('Fetching available models from OpenAI...');
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    try {
      const startTime = Date.now();
      const models = 'tresr';

      const response = {
        models: models, // Wrap the models in the required structure
      };

      const endTime = Date.now();
      this.logger.log(
        `Model fetching completed. Total models: ${models.length}`,
      );
      this.logger.log(`Fetch time: ${endTime - startTime}ms`);
      res.write(JSON.stringify(response));
      res.end();
      this.logger.log('Response ModelTags ended.');
    } catch (error) {
      this.logger.error('Error during OpenAI response generation:', error);
      res.write(`data: ${JSON.stringify({ error: 'Generation failed' })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    }
  }
}
