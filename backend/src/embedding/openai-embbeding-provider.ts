import { Logger } from '@nestjs/common';
import { EmbeddingModel } from 'fastembed';
import openai, { OpenAI } from 'openai';
import { EmbeddingDownloader } from 'src/downloader/embedding-downloader';

export class openAIEmbProvider {
  private static logger = new Logger(openAIEmbProvider.name);

  private static openai = () => {
    return new OpenAI({
      apiKey: process.env.OPEN_API_KEY,
    });
  };

  static async generateEmbResponse(model: string, message: string) {
    const embedding = await this.openai().embeddings.create({
      model: model,
      input: message,
      encoding_format: 'float',
    });
    console.log(embedding.data[0].embedding);
  }

  static async getEmbList() {
    try {
      const models = await this.openai().models.list();
      Object.values(models).filter((model) => model.object === 'embedding');
      this.logger.log(`Models fetched: ${models.data.length}`);
    } catch (error) {
      this.logger.error('Error fetching models:', error);
    }
  }
}
