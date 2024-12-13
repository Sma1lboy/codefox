import { Logger } from '@nestjs/common';
import { PipelineType, pipeline, env } from '@huggingface/transformers';
import { getModelPath, getModelsDir } from 'src/config/common-path';
env.allowLocalModels = true;
env.localModelPath = getModelsDir();
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
      cache_dir: getModelsDir(),
    });
    return pipelineInstance;
  }

  public async getLocalModel(task: string, model: string): Promise<any> {
    const pipelineInstance = await pipeline(task as PipelineType, model, {
      local_files_only: true,
      revision: 'local',
    });

    return pipelineInstance;
  }
}
