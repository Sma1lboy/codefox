import { ConfigLoader, EmbeddingConfig } from '../../config/config-loader';
import { EmbeddingDownloader } from '../embedding-downloader';
import { downloadAllEmbeddings } from '../universal-utils';

const originalIsArray = Array.isArray;

Array.isArray = jest.fn((type: any): type is any[] => {
  if (
    type &&
    type.constructor &&
    (type.constructor.name === 'Float32Array' ||
      type.constructor.name === 'BigInt64Array')
  ) {
    return true;
  }
  return originalIsArray(type);
}) as unknown as (arg: any) => arg is any[];

describe('loadAllEmbeddingModels with real model loading', () => {
  let embConfigLoader: ConfigLoader;

  beforeAll(async () => {
    embConfigLoader = ConfigLoader.getInstance();
    const embConfig: EmbeddingConfig = {
      model: 'fast-bge-base-en-v1.5',
      endpoint: 'http://localhost:11434/v1',
      token: 'your-token-here',
    };
    embConfigLoader.addConfig(embConfig);

    console.log('preload starts');
    await downloadAllEmbeddings();
    console.log('preload successfully');
  }, 6000000);

  it('should load real embedding models specified in config', async () => {
    const downloader = EmbeddingDownloader.getInstance();
    const embeddingModel = await downloader.getPipeline(
      'fast-bge-base-en-v1.5',
    );
    expect(embeddingModel).toBeDefined();
    console.log('Loaded Embedding Model:', embeddingModel);

    expect(embeddingModel).toHaveProperty('model');

    try {
      const embeddingOutput = await embeddingModel.embed([
        'Test input sentence for embedding.',
      ]);
      for await (const batch of embeddingOutput) {
        console.log(batch);
      }

      expect(embeddingOutput).toBeDefined();
    } catch (error) {
      console.error('Error during embedding model inference:', error);
    }
  }, 6000000);
});

afterAll(() => {
  Array.isArray = originalIsArray;
});
