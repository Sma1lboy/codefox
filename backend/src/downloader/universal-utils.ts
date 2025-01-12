// model-utils.ts
import { UniversalDownloader } from './model-downloader';
import { Logger } from '@nestjs/common';
import { UniversalStatusManager } from './universal-status';
import { ConfigLoader } from 'src/config/config-loader';
import { getEmbDir, getModelsDir } from 'src/config/common-path';
import { EmbeddingDownloader } from './embedding-downloader';

const logger = new Logger('model-utils');

export enum ConfigType {
  EMBEDDINGS = 'embeddings',
  CHATS = 'models',
}
export enum TaskType {
  CHAT = 'text2text-generation',
  EMBEDDING = 'feature-extraction',
}

export async function downloadAll() {
  await checkAndDownloadAllModels(ConfigType.CHATS);

  Logger.log('embedding load starts');
  await checkAndDownloadAllModels(ConfigType.EMBEDDINGS);
  Logger.log('embedding load ends');
}
async function downloadModelForType(
  type: ConfigType,
  modelName: string,
  task: string,
) {
  const statusManager = UniversalStatusManager.getInstance();
  const storePath =
    type === ConfigType.EMBEDDINGS ? getEmbDir() : getModelsDir();

  if (type === ConfigType.EMBEDDINGS) {
    const embeddingDownloader = EmbeddingDownloader.getInstance();
    try {
      logger.log(`Downloading embedding model: ${modelName}`);
      await embeddingDownloader.getPipeline(modelName);
      statusManager.updateStatus(modelName, true);
      logger.log(`Successfully downloaded embedding model: ${modelName}`);

      Logger.log('embedding load finished');
    } catch (error) {
      logger.error(
        `Failed to download embedding model ${modelName}:`,
        error.message,
      );
      statusManager.updateStatus(modelName, false);
      throw error;
    }
  } else {
    const downloader = UniversalDownloader.getInstance();
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
      logger.log(
        `Downloading chat model: ${modelName} for task: ${task} in path: ${storePath}`,
      );
      await downloader.getPipeline(task, modelName, storePath);
      statusManager.updateStatus(modelName, true);
      logger.log(`Successfully downloaded chat model: ${modelName}`);
    } catch (error) {
      logger.error(`Failed to download model ${modelName}:`, error.message);
      statusManager.updateStatus(modelName, false);
      throw error;
    }
  }
}

export async function checkAndDownloadAllModels(
  type: ConfigType,
): Promise<void> {
  const configLoader = ConfigLoader.getInstance(type);
  const modelsConfig = configLoader.getAllConfigs();

  logger.log('Checking and downloading configured models...');

  if (!modelsConfig.length) {
    logger.warn(`No ${type} models configured`);
    return;
  }

  const downloadTasks = modelsConfig.map(async (config) => {
    const { model, task } = config;
    const taskType =
      task ||
      (type === ConfigType.EMBEDDINGS ? TaskType.EMBEDDING : TaskType.CHAT);
    await downloadModelForType(type, model, taskType);
  });

  try {
    await Promise.all(downloadTasks);
    logger.log(`All ${type} models downloaded successfully.`);
  } catch (error) {
    logger.error(`One or more ${type} models failed to download.`);
    throw error;
  }
}
