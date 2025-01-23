import DependenciesEmbeddingHandler from '../dependencies-context/dependencies-embedding-handler';

const mockAdd = jest.fn().mockResolvedValue(true);
const mockQuery = jest.fn().mockResolvedValue({
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
});

jest.mock('chromadb', () => ({
  ChromaClient: jest.fn().mockImplementation(() => ({
    getOrCreateCollection: jest.fn().mockResolvedValue({
      add: mockAdd,
      query: mockQuery,
    }),
  })),
}));

describe('DependenciesEmbeddingHandler', () => {
  let handler: DependenciesEmbeddingHandler;

  beforeEach(async () => {
    jest.clearAllMocks();
    handler = new DependenciesEmbeddingHandler();
    await handler['initPromise'];
  });

  test('should initialize successfully', () => {
    expect(handler).toBeDefined();
  });

  test('should add package successfully', async () => {
    const packageName = 'react';
    const version = '18.2.0';

    await handler.addPackage(packageName, version);
  });

  test('should add multiple packages', async () => {
    const packages = [
      { name: 'react', version: '18.2.0' },
      { name: 'lodash', version: '4.17.21' },
    ];

    await handler.addPackages(packages);
    expect(mockAdd).toHaveBeenCalled();
  });

  test('should return search results', async () => {
    const query = 'React component lifecycle';
    const results = await handler.searchContext(query);

    expect(results[0]).toEqual({
      name: 'react',
      version: '18.2.0',
      content: 'React component lifecycle',
    });
  });

  test('should handle empty search results', async () => {
    mockQuery.mockResolvedValueOnce({
      documents: [[]],
    });

    const results = await handler.searchContext('nonexistent');
    expect(results).toHaveLength(0);
  });

  test('should handle query failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Query failed'));
    await expect(handler.searchContext('test')).rejects.toThrow('Query failed');
  });
});
