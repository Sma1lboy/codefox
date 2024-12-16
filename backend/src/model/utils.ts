import { ChatConfig, ConfigLoader } from 'src/config/config-loader';
import { ModelDownloader } from './model-downloader';
import { Logger } from '@nestjs/common';

const logger = new Logger('model-utils');
export async function downloadAllModels(): Promise<void> {
  // TODO: verify or download embedding model to
  const configLoader = ConfigLoader.getInstance();
  configLoader.validateConfig();
  const chats = configLoader.get<ChatConfig[]>('');
  const downloader = ModelDownloader.getInstance();
  logger.log('Loaded config:', chats);
  const loadPromises = chats.map(async (chatConfig: ChatConfig) => {
    const { model, task } = chatConfig;
    try {
      downloader.logger.log(model, task);
      await downloader.downloadModel(task, model);
    } catch (error) {
      downloader.logger.error(`Failed to load model ${model}:`, error.message);
    }
  });
  await Promise.all(loadPromises);

  downloader.logger.log('All models loaded.');
}
