import { Logger } from "@nestjs/common";
import OpenAI from "openai";
import { systemPrompts } from "../prompt/systemPrompt";
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { GenerateMessageParams } from '../types';
import { Response } from 'express';
import { EmbProvider } from "./embedding-provider";

export class OpenAIEmbProvider extends EmbProvider {
    private logger = new Logger(OpenAIEmbProvider.name);
    private openai: OpenAI;

    async init() : Promise<void>{
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        })
    }

    async generateEmbResponse(
        { model, message, role = 'user' }: GenerateMessageParams,
        res: Response,
    ) : Promise<void> {
        this.logger.log('Generating embedding with OpenAI...');
        res.writeHead(200, {
            'Content-Type': 'text/event-embedding',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          });
      
        try {
            const apiResult = await this.openai.embeddings.create({
                model: model,
                input:  message,
                encoding_format: "float",
            });
            if(apiResult){
                res.write(`embedding: ${JSON.stringify(apiResult.data[0].embedding)}\n\n`);
            }
            res.end();
            this.logger.log('Response stream ended.');
        }catch (error) {
            this.logger.error('Error during OpenAI embedding generation:', error);
            res.write(`data: ${JSON.stringify({ error: 'Generation failed' })}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
        }
    }

    async getEmbList(res: Response): Promise<void>{
        this.logger.log('Fetching available embedding models from OpenAI...');
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        });

        try {
            const startTime = Date.now();
            const models = await this.openai.models.list();
            const embeddingModels = models.data.filter((model) =>
                model.id.includes("embedding")
              ); 
            const endTime = Date.now();
            this.logger.log(
                `Embedding model fetching completed. Total embedding models: ${models.data.length}`,
            );
            this.logger.log(`Fetch time: ${endTime - startTime}ms`);
            res.write(JSON.stringify(embeddingModels));
            res.end();
            this.logger.log('Response embedding ModelTags ended.');
        } catch (error) {
            this.logger.error('Error during OpenAI response generation:', error);
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
    }
}