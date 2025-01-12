import { Logger } from '@nestjs/common';
import { EmbeddingModel } from 'fastembed';
import { EmbeddingDownloader } from 'src/downloader/embedding-downloader';

export class localEmbProvider {
  private static logger = new Logger(localEmbProvider.name);

  static async generateEmbResponse(model: string, message: string[]) {
    const embLoader = EmbeddingDownloader.getInstance();
    try {
      const embeddingModel = await embLoader.getPipeline(model);
      const embeddings = embeddingModel.embed(message);

      for await (const batch of embeddings) {
        Logger.log(batch);
      }
    } catch (error) {
      this.logger.log(`error when using ${model} api`);
    }
  }

  static async getEmbList() {
    Object.values(EmbeddingModel).forEach((model) => {
      this.logger.log(model);
    });
  }
}
