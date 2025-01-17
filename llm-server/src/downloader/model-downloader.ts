import { Logger } from '@nestjs/common';
import { PipelineType, pipeline, env } from '@huggingface/transformers';
import { isRemoteModel } from './const';
import { UniversalStatusManager } from './universal-status';
import { getModelsDir } from 'codefox-common';

env.allowLocalModels = true;
env.localModelPath = getModelsDir();
export class UniversalDownloader {
  readonly logger = new Logger(UniversalDownloader.name);
  private static instance: UniversalDownloader;
  private readonly statusManager = UniversalStatusManager.getInstance();

  public static getInstance(): UniversalDownloader {
    if (!UniversalDownloader.instance) {
      UniversalDownloader.instance = new UniversalDownloader();
    }
    return UniversalDownloader.instance;
  }

  async getPipeline(task: string, model: string, path: string): Promise<any> {
    if (isRemoteModel(model)) {
      this.logger.log(`Remote model detected: ${model}, marking as downloaded`);
      console.log(this.statusManager);
      this.statusManager.updateStatus(model, true);
      return null;
    }

    this.logger.log(`Starting download for local model: ${model}`);
    try {
      console.log(path);
      const pipelineInstance = await pipeline(task as PipelineType, model, {
        cache_dir: path,
      });
      this.logger.log(`Successfully downloaded local model: ${model}`);
      this.statusManager.updateStatus(model, true);
      return pipelineInstance;
    } catch (error) {
      this.logger.error(`Failed to download model ${model}: ${error.message}`);
      this.statusManager.updateStatus(model, false);
      return null;
    }
  }

  public async getLocalModel(task: string, model: string): Promise<any> {
    try {
      const pipelineInstance = await pipeline(task as PipelineType, model, {
        local_files_only: true,
        revision: 'local',
        cache_dir: getModelsDir(),
      });
      return pipelineInstance;
    } catch (error) {
      this.logger.error(
        `Failed to load local model: ${model} with error: ${error.message || error}`,
      );
      return null;
    }
  }
}
