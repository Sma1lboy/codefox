import { Logger } from '@nestjs/common';
import { EmbeddingModel } from 'fastembed';
import openai, { OpenAI } from 'openai';
import { EmbeddingDownloader } from 'src/downloader/embedding-downloader';

export class OpenAIEmbProvider {
  private logger = new Logger(OpenAIEmbProvider.name);
  private static instance: OpenAIEmbProvider;
  private openAi: OpenAI;
  static openAi: any;
  static getInstance(){
    if(this.instance){
      return this.instance;
    }
    return new OpenAIEmbProvider();
  }
  constructor(){
    this.openAi = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateEmbResponse(model: string, message: string): Promise<any> {
    const embedding = await this.openAi.embeddings.create({
      model: model,
      input: message,
      encoding_format: 'float',
    });
    console.log(embedding.data[0].embedding);
    return embedding.data[0].embedding;
  }

  async getEmbList(): Promise<any> {
    try {
      const models = await this.openAi.models.list();
      const modelList = Object.values(models).filter(
        (model) => model.object === 'embedding',
      );
      this.logger.log(`Models fetched: ${models.data.length}`);
      return modelList;
    } catch (error) {
      this.logger.error('Error fetching models:', error);
    }
  }
}
