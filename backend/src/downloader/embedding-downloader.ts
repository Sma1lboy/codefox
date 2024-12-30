import { Logger } from '@nestjs/common';
import { UniversalStatusManager } from './universal-status';
import { EmbeddingModel, FlagEmbedding } from "fastembed";
import { getEmbDir } from 'src/config/common-path';
export class EmbeddingDownloader {
  readonly logger = new Logger(EmbeddingDownloader.name);
  private static instance: EmbeddingDownloader;
  private readonly statusManager = UniversalStatusManager.getInstance();

  public static getInstance(): EmbeddingDownloader {
    if (!EmbeddingDownloader.instance) {
        EmbeddingDownloader.instance = new EmbeddingDownloader();
    }
    
    return EmbeddingDownloader.instance;
  }

  async getPipeline(model: string): Promise<any> {
    if(!Object.values(EmbeddingModel).includes(model as EmbeddingModel)){
      this.logger.error(`Invalid model: ${model} is not a valid EmbeddingModel.`);
      return null;
    }
    try{
      const embeddingModel = await FlagEmbedding.init({
          model: model as EmbeddingModel,
          cacheDir: getEmbDir(),
      });
      this.statusManager.updateStatus(model, true);
      return embeddingModel;
    }catch(error){
        this.logger.error(`Failed to load local model: ${model} with error: ${error.message || error}`);
      return null;
    }
    
  }
}
