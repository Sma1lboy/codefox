import { EmbeddingProvider } from 'src/embedding/local-embedding-provider';

describe('Model Provider Test', () => {
  it('should generate a response from the model provider', async () => {
    const res = await EmbeddingProvider.generateEmbResponse(
      'text-embedding-3-small',

      ['Your text string goes here'],
    );
    console.log(res);
  });
});
