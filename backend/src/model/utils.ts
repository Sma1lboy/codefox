import { ModelDownloader } from './downloader/downloader';
import { Logger } from '@nestjs/common';
import { ModelStatusManager } from './model-status';
import { ConfigLoader } from 'src/config/config-loader';

const logger = new Logger('model-utils');

export async function checkAndDownloadAllModels(): Promise<void> {
  const configLoader = ConfigLoader.getInstance();
  const statusManager = ModelStatusManager.getInstance();
  const downloader = ModelDownloader.getInstance();

  const chatConfigs = configLoader.getAllChatConfigs();
  const embeddingConfig = configLoader.getEmbeddingConfig();

  logger.log('Checking and downloading configured models...');

  if (!chatConfigs.length) {
    logger.warn('No chat models configured');
  } else {
    const chatDownloadTasks = chatConfigs.map(async (chatConfig) => {
      const { model, task } = chatConfig;
      const status = statusManager.getStatus(model);

      if (status?.isDownloaded) {
        try {
          await downloader.getLocalModel(task || 'chat', model);
          logger.log(
            `Model ${model} is already downloaded and verified, skipping...`,
          );
          return;
        } catch (error) {
          logger.warn(
            `Model ${model} was marked as downloaded but not found locally, re-downloading...`,
          );
        }
      }

      try {
        logger.log(
          `Downloading chat model: ${model} for task: ${task || 'chat'}`,
        );
        await downloader.downloadModel(task || 'chat', model);
        logger.log(`Successfully downloaded model: ${model}`);
      } catch (error) {
        logger.error(`Failed to download model ${model}:`, error.message);
        throw error;
      }
    });

    try {
      await Promise.all(chatDownloadTasks);
      logger.log('All chat models downloaded successfully.');
    } catch (error) {
      logger.error('One or more chat models failed to download');
      throw error;
    }
  }

  if (embeddingConfig) {
    const { model } = embeddingConfig;
    const status = statusManager.getStatus(model);

    if (status?.isDownloaded) {
      try {
        await downloader.getLocalModel('feature-extraction', model);
        logger.log(
          `Embedding model ${model} is already downloaded and verified, skipping...`,
        );
        return;
      } catch (error) {
        logger.warn(
          `Embedding model ${model} was marked as downloaded but not found locally, re-downloading...`,
        );
      }
    }

    try {
      logger.log(`Downloading embedding model: ${model}`);
      await downloader.downloadModel('feature-extraction', model);
      logger.log(`Successfully downloaded embedding model: ${model}`);
    } catch (error) {
      logger.error(
        `Failed to download embedding model ${model}:`,
        error.message,
      );
      throw error;
    }
  } else {
    logger.warn('No embedding model configured');
  }
}

export async function downloadModel(
  modelName: string,
  isEmbedding = false,
): Promise<void> {
  const configLoader = ConfigLoader.getInstance();
  const statusManager = ModelStatusManager.getInstance();
  const downloader = ModelDownloader.getInstance();

  let modelConfig;
  let task: string;

  if (isEmbedding) {
    modelConfig = configLoader.getEmbeddingConfig();
    task = 'feature-extraction';
  } else {
    modelConfig = configLoader.getChatConfig(modelName);
    task = modelConfig?.task || 'chat';
  }

  if (!modelConfig) {
    throw new Error(`Model configuration not found for: ${modelName}`);
  }

  const status = statusManager.getStatus(modelName);
  if (status?.isDownloaded) {
    try {
      await downloader.getLocalModel(task, modelName);
      logger.log(
        `Model ${modelName} is already downloaded and verified, skipping...`,
      );
      return;
    } catch (error) {
      logger.warn(
        `Model ${modelName} was marked as downloaded but not found locally, re-downloading...`,
      );
    }
  }

  try {
    logger.log(`Downloading model: ${modelName}`);
    await downloader.downloadModel(task, modelName);
    logger.log(`Successfully downloaded model: ${modelName}`);
  } catch (error) {
    logger.error(`Failed to download model ${modelName}:`, error.message);
    throw error;
  }
}
