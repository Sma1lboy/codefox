import { BuilderContext } from 'src/build-system/context';
import { DBSchemaHandler } from '../handlers/database/schemas/schemas';
import { readFileSync } from 'fs';
import markdownToTxt from 'markdown-to-txt';

jest.mock('fs', () => ({
  readFileSync: jest.fn(() => 'mock content'),
}));

const RUN_INTEGRATION_TESTS = process.env.RUN_INTEGRATION_TESTS === 'true';

describe('DBSchemaHandler', () => {
  describe('Integration Tests', () => {
    (RUN_INTEGRATION_TESTS ? describe : describe.skip)(
      'Schema Generation Tests',
      () => {
        it('should generate schema for blog system', async () => {
          const handler = new DBSchemaHandler();
          const context = new BuilderContext(
            {
              id: 'test',
              name: 'test db schema',
              version: '1.0.0',
              description: 'test db schema',
              steps: [],
            },
            'test-id-schema-1',
          );

          const mdFileContent = readFileSync(
            './db-requirement.document.md',
            'utf-8',
          );
          const plainText = markdownToTxt(mdFileContent);
          const result = await handler.run(context, plainText);
          console.log(result);
        }, 30000);
      },
    );
  });

  describe('Unit Tests', () => {
    it('should initialize correctly', () => {
      const handler = new DBSchemaHandler();
      expect(handler).toBeDefined();
      expect(handler.id).toBe('OP:DATABASE:SCHEMAS');
    });
  });
});
