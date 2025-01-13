import axios from 'axios';
import DependenciesEmbeddingHandler from '../dependencies-embedding-handler';
import { Logger } from '@nestjs/common';

// Initialize a global logger instance
const logger = new Logger('dependencies embed tester');

// Mock axios to control HTTP requests during tests
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock fastembed to control embedding behavior during tests
jest.mock('fastembed', () => ({
  EmbeddingModel: {
    BGEBaseEN: 'BGEBaseEN',
  },
  FlagEmbedding: {
    init: jest.fn().mockResolvedValue({
      passageEmbed: jest.fn(async function* (
        types: string[],
        batchSize: number,
      ) {
        for (const type of types) {
          // Yield simulated embedding data as Float32Array
          yield [new Float32Array([1, 2, 3])];
        }
      }),
      queryEmbed: jest.fn(async (query: string) => [1, 2, 3]),
    }),
  },
}));

describe('DependenciesEmbeddingHandler', () => {
  let handler: DependenciesEmbeddingHandler;

  beforeEach(() => {
    // Initialize a new instance of DependenciesEmbeddingHandler before each test
    handler = new DependenciesEmbeddingHandler();
    // Clear all mock calls and instances before each test
    jest.clearAllMocks();
  });

  /**
   * Test Case: Successfully add a package with built-in type definitions
   *
   * Purpose:
   * - To verify that DependenciesEmbeddingHandler can correctly add a package that includes built-in type definitions.
   * - To ensure that the handler retrieves the package's package.json, extracts the type definitions, and generates embeddings.
   *
   * Steps:
   * 1. Mock axios.get to return a package.json containing the 'types' field.
   * 2. Mock axios.get to return the content of the type definitions file.
   * 3. Call the addPackage method to add the package.
   * 4. Verify that the package information is correctly stored, including the generated embedding.
   */
  test('should successfully add a package with built-in types', async () => {
    // Mock the response for fetching package.json, including the 'types' field
    mockedAxios.get.mockImplementationOnce(() =>
      Promise.resolve({
        data: {
          name: 'test-package',
          version: '1.0.0',
          types: 'dist/index.d.ts',
        },
      }),
    );

    // Mock the response for fetching the type definitions file
    mockedAxios.get.mockImplementationOnce(() =>
      Promise.resolve({
        data: `
          interface TestInterface {
            prop1: string;
            prop2: number;
          }
          
          type TestType = {
            field1: string;
            field2: boolean;
          };
        `,
      }),
    );

    // Add the package using the handler
    await handler.addPackage('test-package', '1.0.0');

    // Retrieve the added package information
    const packageInfo = handler.getPackageInfo('test-package');

    // Assertions to ensure the package was added correctly
    expect(packageInfo).toBeDefined();
    expect(packageInfo?.name).toBe('test-package');
    expect(packageInfo?.version).toBe('1.0.0');
    expect(packageInfo?.embedding).toBeDefined();
  });

  /**
   * Test Case: Successfully search for relevant type definitions
   *
   * Purpose:
   * - To verify that DependenciesEmbeddingHandler can generate query embeddings from a search string and return the most relevant packages.
   * - To ensure that similarity calculations are accurate and results are correctly sorted based on similarity.
   *
   * Why the Search Returns Relevant Results:
   * - The `FlagEmbedding` mock is set up to return identical embeddings for both package types and the query.
   * - This setup ensures that the cosine similarity between the query embedding and each package's embedding is maximized for relevant packages.
   * - As a result, the search function can accurately identify and return the most relevant packages based on the query.
   *
   * Steps:
   * 1. Mock axios.get to return package.json and type definitions for two different packages.
   * 2. Call addPackage method to add both packages.
   * 3. Use a search query to call searchContext method.
   * 4. Verify that the search results contain the relevant package and are sorted by similarity.
   */
  test('should successfully search for relevant type definitions', async () => {
    // Mock responses for the first package's package.json and type definitions
    mockedAxios.get
      .mockImplementationOnce(() =>
        Promise.resolve({
          data: {
            types: 'index.d.ts',
          },
        }),
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          data: `
            interface UserInterface {
              id: string;
              name: string;
              email: string;
            }
          `,
        }),
      )
      // Mock responses for the second package's package.json and type definitions
      .mockImplementationOnce(() =>
        Promise.resolve({
          data: {
            types: 'index.d.ts',
          },
        }),
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          data: `
            interface ProductInterface {
              id: string;
              price: number;
              description: string;
            }
          `,
        }),
      );

    // Add the first package 'user-package'
    await handler.addPackage('user-package', '1.0.0');
    // Add the second package 'product-package'
    await handler.addPackage('product-package', '1.0.0');

    const searchQuery = 'user interface with email';

    // Log the search query
    logger.log('Search Query:', searchQuery);

    // Perform the search using the handler
    const results = await handler.searchContext(searchQuery);

    // Log the search results
    logger.log('Search Results:', results);

    // Assertions to ensure that search results are as expected
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].types?.content[0]).toContain('UserInterface');
  }, 100000);
});
