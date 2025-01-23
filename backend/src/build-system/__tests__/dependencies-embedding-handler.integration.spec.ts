/**
 * This test is not a integration test now,
 * there is some issue with jest integration test setup with chromadb
 */
import { Logger } from '@nestjs/common';
import DependenciesEmbeddingHandler from '../dependencies-context/dependencies-embedding-handler';

const logger = new Logger('dependencies embed tester');
const isIntegrationTest = process.env.INTEGRATION_TEST === '1';

// Mock ChromaDB
jest.mock('chromadb', () => ({
  ChromaClient: jest.fn().mockImplementation(() => ({
    getOrCreateCollection: jest.fn().mockResolvedValue({
      add: jest.fn().mockResolvedValue(true),
      query: jest.fn().mockResolvedValue({
        documents: [
          [
            JSON.stringify({
              name: 'react',
              version: '18.2.0',
              content: 'React component lifecycle',
            }),
          ],
        ],
        metadatas: [[{ name: 'react', version: '18.2.0' }]],
      }),
    }),
  })),
}));

// Mock Array.isArray
const originalArrayIsArray = Array.isArray;
Array.isArray = function (type: any): boolean {
  if (
    type?.constructor?.name === 'Float32Array' ||
    type?.constructor?.name === 'BigInt64Array'
  ) {
    return true;
  }
  return originalArrayIsArray(type);
} as typeof Array.isArray;

(isIntegrationTest ? describe : describe.skip)(
  'DependenciesEmbeddingHandler Integration Tests',
  () => {
    let handler: DependenciesEmbeddingHandler;

    beforeEach(async () => {
      handler = new DependenciesEmbeddingHandler();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    test('should add real packages and perform a relevant search', async () => {
      const packagesToAdd = [
        { name: 'lodash', version: '4.17.21' },
        { name: 'react', version: '18.2.0' },
      ];

      await handler.addPackages(packagesToAdd);
      const searchQuery = 'React component lifecycle methods';
      const results = await handler.searchContext(searchQuery);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('name', 'react');
      expect(results[0]).toHaveProperty('version', '18.2.0');
    });
  },
);
