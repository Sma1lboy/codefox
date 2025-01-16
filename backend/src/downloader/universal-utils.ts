// model-utils.ts
import { Logger } from '@nestjs/common';
import { UniversalStatusManager } from './universal-status';
import { EmbeddingDownloader } from './embedding-downloader';
import { ConfigLoader, getEmbDir } from 'codefox-common';

const logger = new Logger('model-utils');

export enum TaskType {
  EMBEDDING = 'feature-extraction',
}

export async function downloadAllEmbeddings() {
  console.log('Embedding load starts');
  await checkAndDownloadAllEmbeddings();
  console.log('Embedding load ends');
}

async function downloadEmbeddingModel(modelName: string) {
  const statusManager = UniversalStatusManager.getInstance();
  const embeddingDownloader = EmbeddingDownloader.getInstance();
  const storePath = getEmbDir();

  try {
    logger.log(`Downloading embedding model: ${modelName}`);
    await embeddingDownloader.getPipeline(modelName);
    statusManager.updateStatus(modelName, true);
    logger.log(`Successfully downloaded embedding model: ${modelName}`);
    console.log('Embedding load finished');
  } catch (error) {
    logger.error(
      `Failed to download embedding model ${modelName}:`,
      error.message,
    );
    statusManager.updateStatus(modelName, false);
    throw error;
  }
}

export async function checkAndDownloadAllEmbeddings(): Promise<void> {
  const configLoader = ConfigLoader.getInstance();
  const modelsConfig = configLoader.getAllEmbeddingModelConfigs();

  logger.log('Checking and downloading configured embedding models...');

  if (!modelsConfig || !modelsConfig.length) {
    logger.warn('No embedding models configured');
    return;
  }

  const downloadTasks = modelsConfig.map(async (config) => {
    const { model } = config;
    await downloadEmbeddingModel(model);
  });

  try {
    await Promise.all(downloadTasks);
    logger.log('All embedding models downloaded successfully.');
  } catch (error) {
    logger.error('One or more embedding models failed to download.');
    throw error;
  }
}
