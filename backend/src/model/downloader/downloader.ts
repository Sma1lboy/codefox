import { Logger } from '@nestjs/common';
import { PipelineType, pipeline, env } from '@huggingface/transformers';
import { getModelPath, getModelsDir } from 'src/config/common-path';
import { isRemoteModel } from './const';
import { ModelStatusManager } from '../model-status';

env.allowLocalModels = true;
env.localModelPath = getModelsDir();

export class ModelDownloader {
  readonly logger = new Logger(ModelDownloader.name);
  private static instance: ModelDownloader;
  private readonly statusManager: ModelStatusManager;

  private constructor() {
    this.statusManager = ModelStatusManager.getInstance();
  }

  public static getInstance(): ModelDownloader {
    if (!ModelDownloader.instance) {
      ModelDownloader.instance = new ModelDownloader();
    }
    return ModelDownloader.instance;
  }

  async downloadModel(task: string, model: string): Promise<any> {
    if (isRemoteModel(model)) {
      this.logger.log(`Remote model detected: ${model}, marking as downloaded`);
      this.statusManager.updateStatus(model, true);
      return null;
    }

    this.logger.log(`Starting download for local model: ${model}`);
    try {
      const pipelineInstance = await pipeline(task as PipelineType, model, {
        cache_dir: getModelsDir(),
      });
      this.logger.log(`Successfully downloaded local model: ${model}`);
      this.statusManager.updateStatus(model, true);
      return pipelineInstance;
    } catch (error) {
      this.logger.error(`Failed to download model ${model}: ${error.message}`);
      this.statusManager.updateStatus(model, false);
      throw error;
    }
  }

  public async getLocalModel(task: string, model: string): Promise<any> {
    if (isRemoteModel(model)) {
      this.logger.log(`Remote model detected: ${model}, marking as downloaded`);
      this.statusManager.updateStatus(model, true);
      return null;
    }

    this.logger.log(`Checking local model: ${model}`);
    try {
      const pipelineInstance = await pipeline(task as PipelineType, model, {
        local_files_only: true,
        revision: 'local',
      });
      this.statusManager.updateStatus(model, true);
      return pipelineInstance;
    } catch (error) {
      this.logger.error(`Failed to get local model ${model}: ${error.message}`);
      this.statusManager.updateStatus(model, false);
      throw error;
    }
  }
}
