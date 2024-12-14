import * as fs from 'fs-extra';
import * as path from 'path';
import { FileGeneratorHandler } from '../node/file-generate'; // Update with actual file path to the handler
import * as normalizePath from 'normalize-path';

describe('FileGeneratorHandler', () => {
  const projectSrcPath = normalizePath(
    path.join('src', 'build-system', '__tests__', 'test-project'),
  );

  const mdFilePath = normalizePath(
    path.join('src', 'build-system', '__tests__', 'file-arch.md'),
  );

  const structMdFilePath = normalizePath(
    path.join('src', 'build-system', '__tests__', 'file-structure-document.md'),
  );

  beforeEach(async () => {
    // Ensure the project directory is clean
    await fs.remove(
      normalizePath(
        path.join('src', 'build-system', '__tests__', 'test-project', 'src'),
      ),
    );
  });

  afterEach(async () => {
    // Clean up the generated test files
    await fs.remove(
      normalizePath(
        path.join('src', 'build-system', '__tests__', 'test-project', 'src'),
      ),
    );
  });

  it('should generate files based on file-arch.md', async () => {
    const archMarkdownContent = fs.readFileSync(
      normalizePath(path.resolve(mdFilePath)),
      'utf8',
    );
    const structMarkdownContent = fs.readFileSync(
      normalizePath(path.resolve(structMdFilePath)),
      'utf8',
    );

    const handler = new FileGeneratorHandler();
    handler.generateFiles(structMarkdownContent, projectSrcPath);

    // Run the file generator with the JSON data
    const result = await handler.generateFiles(
      archMarkdownContent,
      projectSrcPath,
    );

    console.log('File generation result:', result);

    // Verify that all files exist
    const jsonData = JSON.parse(
      /<GENERATEDCODE>([\s\S]*?)<\/GENERATEDCODE>/.exec(
        archMarkdownContent,
      )![1],
    );
    const files = Object.keys(jsonData.files);

    for (const file of files) {
      const filePath = path.resolve(projectSrcPath, file);
      expect(fs.existsSync(filePath)).toBeTruthy();
    }
  }, 30000);
});
