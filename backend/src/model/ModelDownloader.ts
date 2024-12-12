import { Logger } from '@nestjs/common';
import { PipelineType, pipeline, env } from '@huggingface/transformers';
import { getModelsDir } from 'src/config/common-path';
env.allowLocalModels = true;
export class ModelDownloader {
  readonly logger = new Logger(ModelDownloader.name);
  private static instance: ModelDownloader;
  public static getInstance(): ModelDownloader {
    if (!ModelDownloader.instance) {
      ModelDownloader.instance = new ModelDownloader();
    }
    return ModelDownloader.instance;
  }

  async downloadModel(task: string, model: string): Promise<any> {
    const pipelineInstance = await pipeline(task as PipelineType, model, {
      cache_dir: 'C:/Users/LOVE/Documents/GitHub/codefox/models',
    });
    return pipelineInstance;
  }

  // public getModel(chatKey: string): any {
  //   return ModelDownloader.loadedModels.get(chatKey);
  // }
}
