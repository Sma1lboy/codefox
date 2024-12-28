// model-utils.ts
import { UniversalDownloader } from './universal-downloader';
import { Logger } from '@nestjs/common';
import { UniversalStatusManager } from './universal-status';
import {ModelConfig} from '../config/config-loader';
import { ConfigLoader } from 'src/config/config-loader';
import { getEmbDir, getModelsDir } from 'src/config/common-path';

const logger = new Logger('model-utils');

export enum ConfigType {
  EMBEDDINGS = 'embeddings',
  CHATS = 'models',
}
export enum TaskType{
  CHAT = "text2text-generation",
  EMBEDDING = "feature-extraction",
}
export async function downloadAllConfig(): Promise<void> {
  downloadAll(ConfigType.CHATS);
  downloadAll(ConfigType.EMBEDDINGS);
  
}
export async function downloadAll(type: ConfigType): Promise<void> {
  const configLoader = ConfigLoader.getInstance(type);
  const statusManager = UniversalStatusManager.getInstance(type);
  const downloader = UniversalDownloader.getInstance();
  let storePath: string = (type ==  ConfigType.EMBEDDINGS) ? getEmbDir() : getModelsDir();

  const chatConfigs = configLoader.getAllConfigs();
  logger.log('Loaded chat configurations:', chatConfigs);

  if (!chatConfigs.length) {
    logger.warn('No chat models configured');
    return;
  }

  const downloadTasks = chatConfigs.map(async (chatConfig) => {
    const { model, task } = chatConfig;
    const status = statusManager.getStatus(model);

    // Skip if already downloaded
    if (status?.isDownloaded) {
      logger.log(`Model ${model} is already downloaded, skipping...`);
      return;
    }

    try {
      logger.log(`Downloading model: ${model} for task: ${task || 'chat'}`);
      await downloader.getPipeline(task || 'text2text-generation', model, storePath);

      statusManager.updateStatus(model, true);
      logger.log(`Successfully downloaded model: ${model}`);
    } catch (error) {
      logger.error(`Failed to download model ${model}:`, error.message);
      statusManager.updateStatus(model, false);
      throw error;
    }
  });

  try {
    await Promise.all(downloadTasks);
    logger.log('All models downloaded successfully.');
  } catch (error) {
    logger.error('One or more models failed to download');
    throw error;
  }
}

export async function downloadModel(type: ConfigType, modelName: string): Promise<void> {
  const configLoader = ConfigLoader.getInstance(type);
  const statusManager = UniversalStatusManager.getInstance(type);
  const downloader =  UniversalDownloader.getInstance();
  

  const config = configLoader.getConfig(modelName);
  if (!config) {
    throw new Error(`Model configuration not found for: ${modelName}`);
  }
  const task = type === ConfigType.EMBEDDINGS ? TaskType.EMBEDDING : (config as ModelConfig).task || TaskType.CHAT;
  const path = type === ConfigType.EMBEDDINGS ? getEmbDir() : getModelsDir();
  try {
    logger.log(`Downloading model: ${modelName}`);
    await downloader.getPipeline(task, modelName, path);
    statusManager.updateStatus(modelName, true);
    logger.log(`Successfully downloaded model: ${modelName}`);
  } catch (error) {
    logger.error(`Failed to download model ${modelName}:`, error.message);
    statusManager.updateStatus(modelName, false);
    throw error;
  }
}
