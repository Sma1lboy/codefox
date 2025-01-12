// model-utils.ts
import { UniversalDownloader } from './model-downloader';
import { Logger } from '@nestjs/common';
import { UniversalStatusManager } from './universal-status';
import { ConfigLoader } from '../config/config-loader';
import { getModelsDir } from '../config/common-path';

const logger = new Logger('model-utils');

export async function downloadAll() {
  logger.log('Starting model download process...');
  await checkAndDownloadAllModels();
}

async function downloadModel(modelName: string, task: string) {
  const statusManager = UniversalStatusManager.getInstance();
  const storePath = getModelsDir();
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
      `Downloading model: ${modelName} for task: ${task} in path: ${storePath}`,
    );
    await downloader.getPipeline(task, modelName, storePath);
    statusManager.updateStatus(modelName, true);
    logger.log(`Successfully downloaded model: ${modelName}`);
  } catch (error) {
    logger.error(`Failed to download model ${modelName}:`, error.message);
    statusManager.updateStatus(modelName, false);
    throw error;
  }
}

export async function checkAndDownloadAllModels(): Promise<void> {
  const configLoader = ConfigLoader.getInstance();
  const modelsConfig = configLoader.getAllConfigs();

  logger.log('Checking and downloading configured models...');

  if (!modelsConfig.length) {
    logger.warn(`No models configured`);
    return;
  }

  const downloadTasks = modelsConfig.map(async config => {
    const { model, task } = config;
    await downloadModel(model, task);
  });

  try {
    await Promise.all(downloadTasks);
    logger.log(`All models downloaded successfully.`);
  } catch (error) {
    logger.error(`One or more models failed to download.`);
    throw error;
  }
}
