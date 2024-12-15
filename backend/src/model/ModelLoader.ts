import { ChatConfig, ConfigLoader } from 'src/config/ConfigLoader';
import { ModelDownloader } from './ModelDownloader';

export async function downloadAllModels(): Promise<void> {
  const configLoader = new ConfigLoader();
  configLoader.validateConfig();
  const chats = configLoader.get<ChatConfig[]>('chats');
  const downloader = ModelDownloader.getInstance();
  const loadPromises = chats.map(async (chatConfig: ChatConfig) => {
    const { model, task } = chatConfig;
    try {
      downloader.logger.log(model, task);
      const pipelineInstance = await downloader.downloadModel(task, model);
    } catch (error) {
      downloader.logger.error(`Failed to load model ${model}:`, error.message);
    }
  });

  await Promise.all(loadPromises);

  downloader.logger.log('All models loaded.');
}
