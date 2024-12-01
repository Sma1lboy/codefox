import * as fs from 'fs-extra';
import * as path from 'path';
import { FileGeneratorHandler } from '../node/file-generate'; // Update with actual file path to the handler

describe('FileGeneratorHandler', () => {
  const projectSrcPath = 'src\\build-system\\__tests__\\test-project\\src\\';

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
    const jsonFilePath = path.resolve(
      'src\\build-system\\__tests__\\file-arch.json',
    );
    const jsonData = fs.readJSONSync(jsonFilePath);

    // Run the file generator with the JSON data
    const result = await handler.generateFiles(jsonData, projectSrcPath);

    // Write result to console and verify success
    console.log(result);
    expect(result.success).toBe(true);

    // Verify files were generated correctly
    const generatedFiles = Object.keys(jsonData.files);
    for (const fileName of generatedFiles) {
      const filePath = path.resolve(projectSrcPath, fileName);
      const fileExists = await fs.pathExists(filePath);
      expect(fileExists).toBe(true);
    }
  }, 30000);
});
