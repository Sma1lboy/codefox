import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '@nestjs/common';

export class FileGeneratorHandler {
  private readonly logger = new Logger('FileGeneratorHandler');

  /**
   * Generate files based on the JSON extracted from a Markdown file.
   * @param markdownContent The Markdown content containing the JSON.
   * @param projectSrcPath The base directory where files should be generated.
   */
  async generateFiles(
    markdownContent: string,
    projectSrcPath: string,
  ): Promise<{ success: boolean; data: string }> {
    const jsonData = this.extractJsonFromMarkdown(markdownContent);

    this.validateJsonData(jsonData);
    this.detectCycles(jsonData);

    const files = Object.entries(jsonData.files).map(([name, details]) => ({
      name,
      dependencies: details.dependsOn.map((dep) =>
        this.resolveDependency(name, dep),
      ),
    }));

    const independentFiles = files.filter(
      (file) => file.dependencies.length === 0,
    );
    const dependentFiles = files.filter((file) => file.dependencies.length > 0);

    const generatedFiles = new Set<string>();

    // Step 1: Generate all independent files
    for (const file of independentFiles) {
      const fullPath = path.resolve(projectSrcPath, file.name);
      this.logger.log(`Generating independent file: ${fullPath}`);
      await this.createFile(fullPath);
      generatedFiles.add(file.name);
    }

    // Step 2: Generate dependent files, resolving dependencies iteratively
    while (dependentFiles.length > 0) {
      let generatedInThisStep = false;

      for (const file of dependentFiles) {
        const unresolvedDeps = file.dependencies.filter(
          (dep) => !generatedFiles.has(dep),
        );

        if (unresolvedDeps.length === 0) {
          const fullPath = path.resolve(projectSrcPath, file.name);
          this.logger.log(`Generating dependent file: ${fullPath}`);
          await this.createFile(fullPath);
          generatedFiles.add(file.name);
          dependentFiles.splice(dependentFiles.indexOf(file), 1);
          generatedInThisStep = true;
        } else {
          this.logger.warn(
            `Unresolved dependencies for ${file.name}: ${JSON.stringify(
              unresolvedDeps,
            )}`,
          );
        }
      }

      if (!generatedInThisStep) {
        const unresolved = dependentFiles.map((file) => ({
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
      data: 'Files and dependencies created successfully.',
    };
  }

  /**
   * Detect circular dependencies in the JSON data.
   * @param jsonData The JSON data to analyze.
   * @throws Error if a circular dependency is detected.
   */
  private detectCycles(jsonData: {
    files: Record<string, { dependsOn: string[] }>;
  }): void {
    const graph = jsonData.files;
    const visited = new Set<string>();
    const currentPath = new Set<string>();

    const dfs = (node: string): void => {
      if (currentPath.has(node)) {
        throw new Error(
          `Circular dependency detected: ${[...currentPath, node].join(' -> ')}`,
        );
      }

      if (!visited.has(node)) {
        currentPath.add(node);
        visited.add(node);

        for (const dependency of graph[node]?.dependsOn || []) {
          dfs(dependency);
        }

        currentPath.delete(node);
      }
    };

    for (const file of Object.keys(graph)) {
      if (!visited.has(file)) {
        dfs(file);
      }
    }
  }

  /**
   * Validate the structure and content of the JSON data.
   * @param jsonData The JSON data to validate.
   * @throws Error if validation fails.
   */
  private validateJsonData(jsonData: {
    files: Record<string, { dependsOn: string[] }>;
  }): void {
    const validPathRegex = /^[a-zA-Z0-9_\-/.]+$/;

    for (const [file, details] of Object.entries(jsonData.files)) {
      // Validate the file path
      if (!validPathRegex.test(file)) {
        throw new Error(`Invalid file path: ${file}`);
      }

      // Validate dependencies
      for (const dependency of details.dependsOn) {
        if (!validPathRegex.test(dependency)) {
          throw new Error(
            `Invalid dependency path "${dependency}" in file "${file}".`,
          );
        }

        // Ensure no double slashes or trailing slashes
        if (dependency.includes('//') || dependency.endsWith('/')) {
          throw new Error(
            `Malformed dependency path "${dependency}" in file "${file}".`,
          );
        }
      }
    }
  }

  /**
   * Resolve a dependency path relative to the current file.
   * @param currentFile The current file's path.
   * @param dependency The dependency path.
   */
  private resolveDependency(currentFile: string, dependency: string): string {
    const currentDir = path.dirname(currentFile);

    // Check if the dependency is a file with an extension
    const hasExtension = path.extname(dependency).length > 0;

    // If the dependency doesn't have an extension and is not CSS/JS, assume it's a TypeScript file
    if (!hasExtension) {
      dependency = path.join(dependency, 'index.ts');
    }

    // Resolve the dependency path relative to the current directory
    const resolvedPath = path.join(currentDir, dependency).replace(/\\/g, '/');
    this.logger.log(`Resolved dependency: ${resolvedPath}`);
    return resolvedPath;
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
