// model-utils.ts
import { ModelDownloader } from './model-downloader';
import { Logger } from '@nestjs/common';
import { ModelStatusManager } from './model-status';
import { ConfigLoader } from 'src/config/config-loader';

const logger = new Logger('model-utils');

export async function downloadAllModels(): Promise<void> {
  const configLoader = ConfigLoader.getInstance();
  const statusManager = ModelStatusManager.getInstance();
  const downloader = ModelDownloader.getInstance();

  const chatConfigs = configLoader.getAllChatConfigs();
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
      await downloader.downloadModel(task || 'chat', model);

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

export async function downloadModel(modelName: string): Promise<void> {
  const configLoader = ConfigLoader.getInstance();
  const statusManager = ModelStatusManager.getInstance();
  const downloader = ModelDownloader.getInstance();

  const chatConfig = configLoader.getChatConfig(modelName);
  if (!chatConfig) {
    throw new Error(`Model configuration not found for: ${modelName}`);
  }

  try {
    logger.log(`Downloading model: ${modelName}`);
    await downloader.downloadModel(chatConfig.task || 'chat', modelName);
    statusManager.updateStatus(modelName, true);
    logger.log(`Successfully downloaded model: ${modelName}`);
  } catch (error) {
    logger.error(`Failed to download model ${modelName}:`, error.message);
    statusManager.updateStatus(modelName, false);
    throw error;
  }
}
