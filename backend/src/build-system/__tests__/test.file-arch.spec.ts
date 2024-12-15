import { BuilderContext } from 'src/build-system/context';
import { FileArchGenerateHandler } from '../handlers/file-arch';
import markdownToTxt from 'markdown-to-txt';
import { readFileSync } from 'fs-extra';

describe('FileArchGenerateHandler', () => {
  it('should generate file architecture document', async () => {
    const handler = new FileArchGenerateHandler();
    const context = new BuilderContext(
      {
        id: 'test',
        name: 'test file arch',
        version: '1.0.0',
        description: 'test file architecture',
        steps: [],
      },
      'test-id-file-arch-1',
    );

    const fileStructure = markdownToTxt(
      readFileSync('./file-structure-document.md', 'utf-8'),
    );
    const dataMapStruct = markdownToTxt(
      readFileSync('./datamap-structure.md', 'utf-8'),
    );

    const result = await handler.run(context, fileStructure, dataMapStruct);
    console.log(result);
  }, 30000);
});
