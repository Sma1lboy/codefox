import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '@nestjs/common';

interface FileEntry {
  name: string;
  dependencies: string[];
}

export class FileGeneratorHandler {
  private readonly logger = new Logger('FileGeneratorHandler');

  /**
   * Generate files based on JSON input and a specified project source path.
   * @param jsonData The JSON file data containing file dependencies.
   * @param projectSrcPath The base path where files should be generated.
   */
  async generateFiles(
    jsonData: { files: Record<string, { dependsOn: string[] }> },
    projectSrcPath: string,
  ): Promise<{ success: boolean; data: string }> {
    const files = Object.entries(jsonData.files).map(([name, details]) => ({
      name,
      dependencies: details.dependsOn,
    }));

    if (!files || files.length === 0) {
      throw new Error('No files to generate.');
    }

    const generatedFiles = new Set<string>();
    const remainingFiles = [...files];

    const generatedResult: Record<string, { dependsOn: string[] }> = {};

    while (remainingFiles.length > 0) {
      let generatedInThisStep = false;

      for (const file of remainingFiles) {
        if (file.dependencies.every((dep) => generatedFiles.has(dep))) {
          const fullPath = path.resolve(projectSrcPath, file.name);
          this.logger.log(`Generating file: ${fullPath}`);
          await this.createFile(fullPath);
          generatedFiles.add(file.name);
          generatedResult[file.name] = { dependsOn: file.dependencies };
          remainingFiles.splice(remainingFiles.indexOf(file), 1);
          generatedInThisStep = true;
        }
      }

      if (!generatedInThisStep) {
        const unresolved = remainingFiles.map((file) => ({
          file: file.name,
          missingDependencies: file.dependencies.filter(
            (dep) => !generatedFiles.has(dep),
          ),
        }));
        this.logger.error(
          'Unresolved dependencies:',
          JSON.stringify(unresolved, null, 2),
        );
        throw new Error('Circular or unresolved dependencies detected.');
      }
    }

    this.logger.log('All files generated successfully.');

    // Return the result as a formatted string
    return {
      success: true,
      data: `<GENERATEDCODE>${JSON.stringify({ files: generatedResult }, null, 2)}</GENERATEDCODE>`,
    };
  }

  /**
   * Create a file, including creating necessary directories.
   * @param filePath The full path of the file to create.
   */
  private async createFile(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);

    // Ensure the directory exists
    await fs.mkdir(dir, { recursive: true });

    // Create the file with a placeholder content
    const content = `// Generated file: ${path.basename(filePath)}`;
    await fs.writeFile(filePath, content, 'utf8');

    this.logger.log(`File created: ${filePath}`);
  }
}
