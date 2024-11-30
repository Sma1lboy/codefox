import { Logger } from '@nestjs/common';
import { PipelineType, pipeline, env } from '@huggingface/transformers';
import { ConfigLoader, ChatConfig } from '../config/ConfigLoader';

type Progress = { loaded: number; total: number };
type ProgressCallback = (progress: Progress) => void;

env.allowLocalModels = false;

export class ModelDownloader {
  private static readonly logger = new Logger(ModelDownloader.name);
  private static readonly loadedModels = new Map<string, any>();

  public static async downloadAllModels(progressCallback: ProgressCallback = () => {}): Promise<void> {
    const configLoader = new ConfigLoader();
    configLoader.validateConfig();
    const chats = configLoader.get<{ [key: string]: ChatConfig }>('chats');

    const loadPromises = Object.entries(chats).map(async ([chatKey, chatConfig]: [string, ChatConfig]) => {
      const { model, task } = chatConfig;
      try {
        ModelDownloader.logger.log(`Starting to load model: ${model}`);
        const pipelineInstance = await ModelDownloader.downloadModel(task, model, progressCallback);
        ModelDownloader.logger.log(`Model loaded successfully: ${model}`);
        this.loadedModels.set(chatKey, pipelineInstance);
      } catch (error) {
        ModelDownloader.logger.error(`Failed to load model ${model}:`, error.message);
      }
    });

    await Promise.all(loadPromises);

    ModelDownloader.logger.log('All models loaded.');
  }

  private static async downloadModel(
    task: string,
    model: string,
    progressCallback?: ProgressCallback,
  ): Promise<any> {
    const pipelineOptions = progressCallback ? { progress_callback: progressCallback } : undefined;
    return pipeline(task as PipelineType, model, pipelineOptions);
  }

  public static getModel(chatKey: string): any {
    return ModelDownloader.loadedModels.get(chatKey);
  }
}

export const getModel = ModelDownloader.getModel;
