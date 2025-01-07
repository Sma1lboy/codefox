import { EmbeddingProvider } from 'src/common/embedding-provider';

describe('Model Provider Test', () => {
  const embProvider = EmbeddingProvider.getInstance();
  it('should generate a response from the model provider', async () => {
    const res = await embProvider.generateEmbResponse(
      'Your text string goes here',
      'text-embedding-3-small',
    );
    console.log(res);
  });
});
