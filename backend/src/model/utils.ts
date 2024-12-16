import { ChatConfig, ConfigLoader } from 'src/config/config-loader';
import { ModelDownloader } from './model-downloader';

export async function downloadAllModels(): Promise<void> {
  const configLoader = new ConfigLoader();
  configLoader.validateConfig();
  const chats = configLoader.get<ChatConfig[]>('');
  const downloader = ModelDownloader.getInstance();
  console.log('Loaded config:', chats);
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
