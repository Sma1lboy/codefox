import { localEmbProvider } from '../local-embedding-provider';
import { EmbeddingModel } from 'fastembed';
import { OpenAIEmbProvider } from '../openai-embbeding-provider';
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

describe('testing embedding provider', () => {
  let openAiProvider: OpenAIEmbProvider;
  it('should load real local models specified in config', async () => {
    const documents = [
      'passage: Hello, World!',
      'query: Hello, World!',
      'passage: This is an example passage.',
      // You can leave out the prefix but it's recommended
      'fastembed-js is licensed under MIT',
    ];

    await localEmbProvider.generateEmbResponse(
      EmbeddingModel.BGEBaseENV15,
      documents,
    );
  }, 6000000);

  it('should load real openai embedding models', async () => {
    openAiProvider = OpenAIEmbProvider.getInstance();
    const res = await openAiProvider.generateEmbResponse(
      'text-embedding-3-small',
      'test document',
    );
    console.log(res);
  }, 6000000);
});

afterAll(() => {
  Array.isArray = originalIsArray;
});
