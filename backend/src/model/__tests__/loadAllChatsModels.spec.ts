import path from 'path';
import * as fs from 'fs';
import { ConfigLoader } from '../../config/config-loader';
import { ModelDownloader } from '../model-downloader';
import { downloadAllModels } from '../utils';
import { getConfigDir, getConfigPath } from 'src/config/common-path';

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

// jest.mock('../../config/config-loader', () => {
//   return {
//     ConfigLoader: jest.fn().mockImplementation(() => {
//       return {
//         get: jest.fn().mockReturnValue({
//           chat1: {
//             model: 'Felladrin/onnx-flan-alpaca-base',
//             task: 'text2text-generation',
//           },
//         }),
//         validateConfig: jest.fn(),
//       };
//     }),
//   };
// });

describe('loadAllChatsModels with real model loading', () => {
  let configLoader: ConfigLoader;
  beforeAll(async () => {
    const testConfig = [
      {
        model: 'Felladrin/onnx-flan-alpaca-base',
        task: 'text2text-generation',
      }
    ];
    const configPath = getConfigPath('config');
    fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2), 'utf8');

    configLoader = new ConfigLoader();
    await downloadAllModels();
  }, 600000);

  it('should load real models specified in config', async () => {
    const downloader = ModelDownloader.getInstance();

    const chat1Model = await downloader.getLocalModel(
      'text2text-generation',
      'Felladrin/onnx-flan-alpaca-base',
    );
    expect(chat1Model).toBeDefined();
    console.log('Loaded Model:', chat1Model);

    expect(chat1Model).toHaveProperty('model');
    expect(chat1Model).toHaveProperty('tokenizer');

    try {
      const chat1Output = await chat1Model(
        'Write me a love poem about cheese.',
        {
          max_new_tokens: 200,
          temperature: 0.9,
          repetition_penalty: 2.0,
          no_repeat_ngram_size: 3,
        },
      );

      console.log('Model Output:', chat1Output);
      expect(chat1Output).toBeDefined();
      expect(chat1Output[0]).toHaveProperty('generated_text');
      console.log(chat1Output[0].generated_text);
    } catch (error) {
      console.error('Error during model inference:', error);
    }
  }, 600000);
});

afterAll(() => {
  Array.isArray = originalIsArray;
});
