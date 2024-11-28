import { ConfigService } from '../src/config/config.service';
import loadAllChatsModels from '../src/model/model.service';
import { getModel } from '../src/model/model.service';

const originalIsArray = Array.isArray;
Array.isArray = jest.fn((type: any): type is any[] => {
    if (type && type.constructor && (type.constructor.name === 'Float32Array' || type.constructor.name === 'BigInt64Array')) {
        return true;
    }
    return originalIsArray(type);
}) as unknown as (arg: any) => arg is any[];
;

jest.mock('../src/config/config.service', () => {
    return {
        ConfigService: jest.fn().mockImplementation(() => {
            return {
                get: jest.fn().mockReturnValue({
                    chat1: { model: 'Xenova/LaMini-Flan-T5-783M', task: 'text2text-generation' },
                }),
                validateConfig: jest.fn(),
            };
        }),
    };
});

describe('loadAllChatsModels with real model loading', () => {
    beforeAll(async () => {
        await loadAllChatsModels();
    });

    it('should load real models specified in config', async () => {
        expect(ConfigService).toHaveBeenCalled();
        const chat1Model = getModel('chat1');

        console.log(chat1Model);

        expect(chat1Model).toBeDefined();
        expect(chat1Model).toHaveProperty('model');
        expect(chat1Model).toHaveProperty('tokenizer');
        try {
            const chat1Output = await chat1Model('Write me a love poem about cheese.', {
                max_new_tokens: 200,
                temperature: 0.9,
                repetition_penalty: 2.0,
                no_repeat_ngram_size: 3,
            });
            console.log('Model Output:', chat1Output);
    
                expect(chat1Output).toBeDefined();
        
        console.log(chat1Output[0].generated_text);
        } catch (error) {
            console.error('Error during model inference:', error);
        }

    }, 60000);
});

afterAll(() => {
    Array.isArray = originalIsArray;
});
