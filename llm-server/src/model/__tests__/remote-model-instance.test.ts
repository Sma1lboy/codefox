import { RemoteOpenAIModelEngine } from '../remote-model-instance';
import { RemoteModelFactory } from '../remote-model-factory';
import axios from 'axios';
import { ModelConfig } from 'codefox-common';

// Mock axios
const mockPost = async () => {};
const mockGet = async () => {};
const mockCreate = () => ({ post: mockPost, get: mockGet });

// Store original axios.create
const originalCreate = axios.create;

// Setup and teardown helpers
const setupMocks = () => {
  (axios.create as any) = mockCreate;
  return {
    post: async () => {},
    get: async () => {},
  };
};

const teardownMocks = () => {
  (axios.create as any) = originalCreate;
};

// Test cases
async function runTests() {
  const mockConfig: ModelConfig = {
    endpoint: 'https://api.example.com',
    token: 'test-token',
    model: 'test-model',
  };

  console.log('Testing instance creation...');
  {
    const mockAxiosInstance = {
      post: async () => ({
        data: {
          choices: [
            {
              message: {
                content: 'Hello, world!',
              },
            },
          ],
        },
      }),
      get: async () => ({}),
    };
    (axios.create as any) = () => mockAxiosInstance;

    const instance = await RemoteModelFactory.createInstance(
      mockConfig,
      'test-model',
    );
    const response = await instance.chat('Hi');
    console.assert(
      response === 'Hello, world!',
      'Instance response should match expected output',
    );
  }

  console.log('Testing streaming response...');
  {
    const mockStream = {
      data: [
        Buffer.from('data: {"choices":[{"delta":{"content":"Hello"}}]}\n'),
        Buffer.from('data: {"choices":[{"delta":{"content":" world!"}}]}\n'),
      ],
    };

    const mockAxiosInstance = {
      post: async () => mockStream,
      get: async () => ({}),
    };
    (axios.create as any) = () => mockAxiosInstance;

    const instance = await RemoteModelFactory.createInstance(
      mockConfig,
      'test-model',
    );

    let content = '';
    for await (const chunk of instance.chatStream('Hi')) {
      content += chunk.choices[0].delta.content || '';
    }

    console.assert(
      content === 'Hello world!',
      'Streaming response should match expected output',
    );
  }

  console.log('Testing error handling...');
  {
    const mockError = new Error('Test error');
    const mockAxiosInstance = {
      post: async () => {
        throw mockError;
      },
      get: async () => ({}),
    };
    (axios.create as any) = () => mockAxiosInstance;

    const instance = await RemoteModelFactory.createInstance(
      mockConfig,
      'test-model',
    );

    try {
      await instance.chat('Hi');
      console.assert(false, 'Should have thrown an error');
    } catch (error) {
      console.assert(
        error.message === 'Test error',
        'Error message should match',
      );
    }
  }

  console.log('Testing factory instance caching...');
  {
    const mockAxiosInstance = {
      post: async () => ({
        data: {
          choices: [
            {
              message: {
                content: 'Hello, world!',
              },
            },
          ],
        },
      }),
      get: async () => ({}),
    };
    (axios.create as any) = () => mockAxiosInstance;

    const instance1 = await RemoteModelFactory.createInstance(
      mockConfig,
      'test-model',
    );
    const instance2 = await RemoteModelFactory.createInstance(
      mockConfig,
      'test-model',
    );

    console.assert(
      instance1 === instance2,
      'Factory should return cached instance for same config and model',
    );
  }

  console.log('All tests completed successfully');
}

// Run tests
runTests().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
