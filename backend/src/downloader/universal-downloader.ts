import { Logger } from '@nestjs/common';
import { PipelineType, pipeline, env, cat } from '@huggingface/transformers';
import { getModelPath, getModelsDir } from 'src/config/common-path';
env.allowLocalModels = true;
env.localModelPath = getModelsDir();
export class UniversalDownloader {
  readonly logger = new Logger(UniversalDownloader.name);
  private static instance: UniversalDownloader;
  public static getInstance(): UniversalDownloader {
    if (!UniversalDownloader.instance) {
        UniversalDownloader.instance = new UniversalDownloader();
    }
    return UniversalDownloader.instance;
  }

  async getPipeline(task: string, model: string, path: string): Promise<any> {
   try{
    const pipelineInstance = await pipeline(task as PipelineType, model, {
      cache_dir: path,
    });
    return pipelineInstance;
   }catch(error){
    this.logger.log(`Download: ${model} failed with error: ${error.message || error}`)
    return null;
   }
  }

  public async getLocalModel(task: string, model: string): Promise<any> {
    try {
      const pipelineInstance = await pipeline(task as PipelineType, model, {
        local_files_only: true,
        revision: 'local',
      });
      return pipelineInstance;
    } catch (error) {
      this.logger.error(`Failed to load local model: ${model} with error: ${error.message || error}`);
      throw null;
    }
  }
}
