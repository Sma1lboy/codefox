import { Response } from 'express';
import path from 'path';
import {
  ChatHistoryItem,
  getLlama,
  LlamaChat,
  LlamaChatSession,
  LlamaContext,
  LlamaModel,
} from 'node-llama-cpp';
import { ModelProvider } from './model-provider.js';
import { Logger } from '@nestjs/common';
import { systemPrompts } from '../prompt/systemPrompt';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { GenerateMessageParams } from '../types.js';

//TODO: using protocol class
export class LlamaModelProvider extends ModelProvider {
  private readonly logger = new Logger(LlamaModelProvider.name);
  private model: LlamaModel;
  private context: LlamaContext;
  
  private session: LlamaChat;

  async initialize(): Promise<void> {
    this.logger.log('Initializing Llama model...');
    const llama = await getLlama();
    const modelPath = path.join(
      process.cwd(),
      '../.codefox/models',
      'LLAMA-3.2-1B-OpenHermes2.5.IQ4_XS.gguf',
    );
    this.logger.log(`Loading model from path: ${modelPath}`);
    this.model = await llama.loadModel({
      modelPath: modelPath,
    });
    this.logger.log('Model loaded successfully.');
    this.context = await this.model.createContext();
    this.logger.log('Llama model initialized and context created.');
    
    this.session = new LlamaChat({
      contextSequence: this.context.getSequence(),
    });
  }

  async generateStreamingResponse(
    { model, messages }: GenerateMessageParams,
    res: Response,
  ): Promise<void> {
    this.logger.log('Generating streaming response with Llama...');
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    
    
    this.logger.log('LlamaChatSession created.');
    let chunkCount = 0;
    const startTime = Date.now();

    // Get the system prompt based on the model
    const systemPrompt = systemPrompts['codefox-basic']?.systemPrompt || '';

    const allMessage = [{ role: 'system', content: systemPrompt }, ...messages];
    // Convert messages array to a single formatted string for Llama
    let chatHistory = this.session.chatWrapper.generateInitialChatHistory({
      systemPrompt
    });
    
    let modelResponse = [];
    messages.map(({role, content}) =>{
      let pushedContent = () => {
        if (role === "assistant") {
          modelResponse.push(content);
          return;
      } else if (role === "user") {
        return {
          type: "user",
          text: content,
        } as ChatHistoryItem;
      } else {
        return {
          type: "system", 
          text: content,
        } as ChatHistoryItem;
      }
      }
      if (pushedContent()) chatHistory.push(pushedContent() as ChatHistoryItem);
    })
    chatHistory.push({
      type: "model",
      response: modelResponse
    });
    console.log(chatHistory);
    try {
      await this.session.generateResponse(chatHistory, {
        
        customStopTriggers: ["\n"," diligently"],
        onTextChunk: chunk => {
          chunkCount++;
          this.logger.debug(`Sending chunk #${chunkCount}: "${chunk}"`);
          res.write(
            `data: ${JSON.stringify({content: chunk})}\n\n`,
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
