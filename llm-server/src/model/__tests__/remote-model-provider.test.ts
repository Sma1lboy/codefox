import { RemoteModelEngine } from '../remote-model-engine';
import axios from 'axios';
import { ModelProviderOptions } from '../../types';
import { Response } from 'express';

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
  const options: ModelProviderOptions = {
    maxConcurrentRequests: 3,
    maxRetries: 2,
    retryDelay: 1000,
  };

  const mockConfig = {
    endpoint: 'https://api.example.com',
    token: 'test-token',
  };

  console.log('Testing initialization...');
  {
    const mockAxiosInstance = {
      post: async () => ({}),
      get: async () => ({}),
    };
    (axios.create as any) = () => mockAxiosInstance;

    const engine = new RemoteModelEngine(
      mockConfig.endpoint,
      mockConfig.token,
      options,
    );
    await engine.initialize();
    console.assert(engine.isInitialized(), 'Engine should be initialized');
  }

  console.log('Testing chat request...');
  {
    const mockResponse = {
      data: {
        choices: [
          {
            message: {
              content: 'Hello, world!',
            },
          },
        ],
      },
    };

    const mockAxiosInstance = {
      post: async () => mockResponse,
      get: async () => ({}),
    };
    (axios.create as any) = () => mockAxiosInstance;

    const engine = new RemoteModelEngine(
      mockConfig.endpoint,
      mockConfig.token,
      options,
    );
    await engine.initialize();

    const params = {
      model: 'test-model',
      messages: [{ role: 'user', content: 'Hi' }],
    };

    const result = await engine.generateResponse(params);
    console.assert(
      result === 'Hello, world!',
      'Response should match expected output',
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

    const engine = new RemoteModelEngine(
      mockConfig.endpoint,
      mockConfig.token,
      options,
    );
    await engine.initialize();

    let writeHeadCalled = false;
    let writeCalled = false;
    let endCalled = false;

    const mockResponse = {
      writeHead: () => {
        writeHeadCalled = true;
      },
      write: () => {
        writeCalled = true;
      },
      end: () => {
        endCalled = true;
      },
      writableEnded: false,
      headersSent: false,
      status: () => mockResponse,
      json: () => {},
    } as unknown as Response;

    const params = {
      model: 'test-model',
      messages: [{ role: 'user', content: 'Hi' }],
    };

    await engine.generateStreamingResponse(params, mockResponse);

    console.assert(writeHeadCalled, 'writeHead should be called');
    console.assert(writeCalled, 'write should be called');
    console.assert(endCalled, 'end should be called');
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

    const engine = new RemoteModelEngine(
      mockConfig.endpoint,
      mockConfig.token,
      options,
    );
    await engine.initialize();

    const params = {
      model: 'test-model',
      messages: [{ role: 'user', content: 'Hi' }],
    };

    try {
      await engine.generateResponse(params);
      console.assert(false, 'Should have thrown an error');
    } catch (error) {
      console.assert(
        error.message === 'Test error',
        'Error message should match',
      );
    }
  }

  console.log('Testing model instance creation...');
  {
    const mockAxiosInstance = {
      post: async () => ({
        data: {
          choices: [
            {
              message: {
                content: 'Hello from instance',
              },
            },
          ],
        },
      }),
      get: async () => ({}),
    };
    (axios.create as any) = () => mockAxiosInstance;

    const engine = new RemoteModelEngine(
      mockConfig.endpoint,
      mockConfig.token,
      options,
    );
    await engine.initialize();

    const instance = engine.createModelInstance('test-model');
    const response = await instance.chat('Hi');
    console.assert(
      response === 'Hello from instance',
      'Instance response should match',
    );
  }

  console.log('All tests completed successfully');
}

// Run tests
runTests().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
