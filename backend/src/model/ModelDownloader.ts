import { Logger } from '@nestjs/common';
import { PipelineType, pipeline, env } from '@huggingface/transformers';
import { ConfigLoader, ChatConfig } from '../config/ConfigLoader';

env.allowLocalModels = false;

export class ModelDownloader {
  private static readonly logger = new Logger(ModelDownloader.name);
  private static readonly loadedModels = new Map<string, any>();

  public static async downloadAllModels(
  ): Promise<void> {
    const configLoader = new ConfigLoader();
    configLoader.validateConfig();
    const chats = configLoader.get<{ [key: string]: ChatConfig }>('chats');

    const loadPromises = Object.entries(chats).map(
      async ([chatKey, chatConfig]: [string, ChatConfig]) => {
        const { model, task } = chatConfig;
        try {
          ModelDownloader.logger.log(`Starting to load model: ${model}`);
          const pipelineInstance = await ModelDownloader.downloadModel(
            task,
            model
          );
          ModelDownloader.logger.log(`Model loaded successfully: ${model}`);
          this.loadedModels.set(chatKey, pipelineInstance);
        } catch (error) {
          ModelDownloader.logger.error(
            `Failed to load model ${model}:`,
            error.message,
          );
        }
      },
    );

    await Promise.all(loadPromises);

    ModelDownloader.logger.log('All models loaded.');
  }

  private static async downloadModel(
    task: string,
    model: string,
  ): Promise<any> {
    let pipelineInstance = await pipeline(task as PipelineType, model);
    console.log(pipelineInstance);
    return pipelineInstance;
  }

  public static getModel(chatKey: string): any {
    return ModelDownloader.loadedModels.get(chatKey);
  }
}

export const getModel = ModelDownloader.getModel;