import { localEmbProvider } from '../local-embbeding-provider';
import { EmbeddingModel } from 'fastembed';
import { openAIEmbProvider } from '../openai-embbeding-provider';
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
  it('should load real models specified in config', async () => {
    let documents = [
      "passage: Hello, World!",
      "query: Hello, World!",
      "passage: This is an example passage.",
      // You can leave out the prefix but it's recommended
      "fastembed-js is licensed under MIT" 
  ];
  
    await localEmbProvider.generateEmbResponse(EmbeddingModel.BGEBaseENV15, documents);
  }, 6000000);

  it('should load openai models specified in config', async () => {
  
    await openAIEmbProvider.generateEmbResponse("text-embedding-3-small", "Your text string goes here");
  }, 6000000);
});

afterAll(() => {
  Array.isArray = originalIsArray;
});
