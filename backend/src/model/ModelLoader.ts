import { ChatConfig, ConfigLoader } from 'src/config/ConfigLoader';
import { ModelDownloader } from './ModelDownloader';

export async function downloadAllModels(): Promise<void> {
  const configLoader = new ConfigLoader();
  configLoader.validateConfig();
  const chats = configLoader.get<{ [key: string]: ChatConfig }>('');
  const downloader = ModelDownloader.getInstance();
  const loadPromises = Object.entries(chats).map(
    async ([chatKey, chatConfig]: [string, ChatConfig]) => {
      const { model, task } = chatConfig;
      try {
        downloader.logger.log(model, task);
        const pipelineInstance = await downloader.downloadModel(task, model);
      } catch (error) {
        downloader.logger.error(
          `Failed to load model ${model}:`,
          error.message,
        );
      }
    },
  );

  await Promise.all(loadPromises);

  downloader.logger.log('All models loaded.');
}
