import * as fs from 'fs-extra';
import * as path from 'path';
import { FileGeneratorHandler } from '../node/file-generate'; // Update with actual file path to the handler

describe('FileGeneratorHandler', () => {
  const projectSrcPath = 'src\\build-system\\__tests__\\test-project\\';

  beforeEach(async () => {
    // Ensure the project directory is clean
    await fs.remove('src\\build-system\\__tests__\\test-project\\src\\');
  });

  afterEach(async () => {
    // Clean up the generated test files
    await fs.remove('src\\build-system\\__tests__\\test-project\\src\\');
  });

  it('should generate files based on file-arch.json', async () => {
    const handler = new FileGeneratorHandler();

    // Read JSON data from file
    const mdFilePath = path.resolve(
      'src\\build-system\\__tests__\\file-arch.md',
    );

    const markdownContent = fs.readFileSync(path.resolve(mdFilePath), 'utf8');

    // Run the file generator with the JSON data
    const result = await handler.generateFiles(markdownContent, projectSrcPath);

    // Verify files were generated correctly
    // const generatedFiles = Object.keys(jsonData.files);
    // for (const fileName of generatedFiles) {
    //   const filePath = path.resolve(projectSrcPath, fileName);
    //   const fileExists = await fs.pathExists(filePath);
    //   expect(fileExists).toBe(true);
    // }

    console.log('File generation result:', result);

    // Verify that all files exist
    const jsonData = JSON.parse(
      /<GENERATEDCODE>([\s\S]*?)<\/GENERATEDCODE>/.exec(markdownContent)![1],
    );
    const files = Object.keys(jsonData.files);

    for (const file of files) {
      const filePath = path.resolve(projectSrcPath, file);
      expect(fs.existsSync(filePath)).toBeTruthy();
    }
  }, 30000);
});
