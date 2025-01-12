import { Logger } from '@nestjs/common';
import DependenciesEmbeddingHandler from '../dependencies-embedding-handler';

// Initialize a global logger instance
const logger = new Logger('dependencies embed tester');

// Only run integration tests if INTEGRATION_TEST environment variable is set to '1'
const isIntegrationTest = process.env.INTEGRATION_TEST === '1';

if (!isIntegrationTest) {
  logger.log(
    'Integration tests are skipped. Set INTEGRATION_TEST=1 to run them.',
  );
} else {
  describe('DependenciesEmbeddingHandler Integration Tests', () => {
    let handler: DependenciesEmbeddingHandler;

    // Increase the default timeout for integration tests
    jest.setTimeout(300000); // 5 minutes

    beforeAll(async () => {
      logger.log(
        'Initializing DependenciesEmbeddingHandler for integration tests...',
      );
      handler = new DependenciesEmbeddingHandler();
      // Wait for the handler to initialize
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
      logger.log('Initialization complete.');
    });

    afterAll(() => {
      logger.log('Integration tests completed.');
    });

    /**
     * Integration Test Case: Add Real Packages and Perform a Search
     *
     * Purpose:
     * - To verify that DependenciesEmbeddingHandler can handle real packages by fetching their type definitions,
     *   generating embeddings, and storing them correctly.
     * - To ensure that the search functionality can retrieve relevant packages based on a real query.
     *
     * Steps:
     * 1. Add multiple real npm packages using the addPackage method.
     * 2. Perform a search with a query related to one of the added packages.
     * 3. Validate that the search results include the relevant package(s) and are correctly ranked.
     */
    test('should add real packages and perform a relevant search', async () => {
      // Define real packages to add
      const packagesToAdd = [
        { name: 'lodash', version: '4.17.21' },
        // { name: 'express', version: '4.18.2' },
        // { name: 'react', version: '18.2.0' },
        // { name: 'typescript', version: '4.9.5' },
      ];

      logger.log('Adding real packages...');

      // Add all packages concurrently
      await handler.addPackages(packagesToAdd);

      logger.log('Packages added successfully.');

      // Define a search query related to one of the packages, e.g., React
      const searchQuery = 'React component lifecycle methods';

      logger.log('Executing search with query:', searchQuery);

      // Perform the search
      const results = await handler.searchContext(searchQuery);

      logger.log('Search results received.');

      // Validate that results are returned
      expect(results.length).toBeGreaterThan(0);

      // Check that at least one of the top results is related to 'react'
      const topResult = results[0];
      expect(topResult.name).toBe('react');
      expect(topResult.version).toBe('18.2.0');

      logger.log('Top search result:', topResult);

      // Optionally, you can print more details or perform additional assertions
    });
  });
}
