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
    markdownContent: string,
    projectSrcPath: string,
  ): Promise<{ success: boolean; data: string }> {
    const resolveDependencyPath = (
      filePath: string,
      dependency: string,
      projectSrcPath: string,
    ): string => {
      const fileDir = path.dirname(filePath); // Directory of the current file
      let resolvedPath = path.resolve(fileDir, dependency); // Resolve relative to the file's location

      // If the dependency doesn't have an extension, assume it's a folder with an index file
      if (!path.extname(resolvedPath)) {
        const isCSS = dependency.includes('css');
        resolvedPath = isCSS
          ? `${resolvedPath}/index.css`
          : `${resolvedPath}/index.ts`;
      }

      // Ensure the resolved path is within the project source path
      return path.relative(projectSrcPath, resolvedPath);
    };

    const jsonData = this.extractJsonFromMarkdown(markdownContent);

    const files = Object.entries(jsonData.files).map(([name, details]) => ({
      name,
      dependencies: details.dependsOn.map((dep) =>
        resolveDependencyPath(
          path.resolve(projectSrcPath, name),
          dep,
          projectSrcPath,
        ),
      ),
    }));

    if (!files || files.length === 0) {
      throw new Error('No files to generate.');
    }

    const generatedFiles = new Set<string>();
    const remainingFiles = [...files];
    const generatedResult: Record<string, { dependsOn: string[] }> = {};
    const visited = new Set<string>();

    while (remainingFiles.length > 0) {
      let generatedInThisStep = false;

      for (const file of remainingFiles) {
        if (visited.has(file.name)) {
          this.logger.error(`Circular dependency detected: ${file.name}`);
          continue;
        }

        visited.add(file.name);

        const unresolvedDeps = file.dependencies.filter(
          (dep) => !generatedFiles.has(dep),
        );

        if (unresolvedDeps.length === 0) {
          const fullPath = path.resolve(projectSrcPath, file.name);
          this.logger.log(`Generating file: ${fullPath}`);
          await this.createFile(fullPath);
          generatedFiles.add(file.name);
          generatedResult[file.name] = { dependsOn: file.dependencies };
          remainingFiles.splice(remainingFiles.indexOf(file), 1);
          generatedInThisStep = true;
        } else {
          this.logger.warn(
            `Unresolved dependencies for ${file.name}: ${JSON.stringify(unresolvedDeps)}`,
          );
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

    return {
      success: true,
      data: `<GENERATEDCODE>${JSON.stringify({ files: generatedResult }, null, 2)}</GENERATEDCODE>`,
    };
  }

  /**
   * Extract JSON data from Markdown content.
   * @param markdownContent The Markdown content containing the JSON.
   */
  private extractJsonFromMarkdown(markdownContent: string): {
    files: Record<string, { dependsOn: string[] }>;
  } {
    const jsonMatch = /<GENERATEDCODE>([\s\S]*?)<\/GENERATEDCODE>/m.exec(
      markdownContent,
    );
    if (!jsonMatch) {
      throw new Error('No JSON found in the provided Markdown content.');
    }

    try {
      return JSON.parse(jsonMatch[1]);
    } catch (error) {
      throw new Error('Invalid JSON format in the Markdown content.');
    }
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
