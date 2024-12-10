import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '@nestjs/common';
import * as toposort from 'toposort';
import { VirtualDirectory } from './virtual-directory';
import { BuilderContext } from 'src/build-system/context';
import { BuildHandler, BuildResult } from 'src/build-system/types';

export class FileGeneratorHandler {
  private readonly logger = new Logger('FileGeneratorHandler');
  private virtualDir: VirtualDirectory;

  constructor(structureMarkdown: string) {
    this.virtualDir = new VirtualDirectory();
  }

  async run(context: BuilderContext, args: unknown): Promise<BuildResult> {
    return {
      success: true,
      data: null,
    };
  }

  /**
   * Generate files based on the JSON extracted from a Markdown file.
   * @param markdownContent The Markdown content containing the JSON.
   * @param projectSrcPath The base directory where files should be generated.
   */
  async generateFiles(
    markdownContent: string,
    projectSrcPath: string,
  ): Promise<{ success: boolean; data: string }> {
    // add test for validate
    const jsonData = this.extractJsonFromMarkdown(markdownContent);
    this.validateJsonData(jsonData);

    // Build the dependency graph and detect cycles before any file operations
    const { graph, nodes } = this.buildDependencyGraph(jsonData);
    this.detectCycles(graph);

    // Add virtual directory validation
    this.validateAgainstVirtualDirectory(nodes);

    // After validation and cycle detection, perform topological sort
    const sortedFiles = this.getSortedFiles(graph, nodes);

    // Generate files in the correct order
    for (const file of sortedFiles) {
      const fullPath = path.resolve(projectSrcPath, file);
      this.logger.log(`Generating file in dependency order: ${fullPath}`);
      // to do
      await this.createFile(fullPath);
    }

    this.logger.log('All files generated successfully.');
    return {
      success: true,
      data: 'Files and dependencies created successfully.',
    };
  }

  /**
   * Build dependency graph from JSON data.
   * @param jsonData The JSON data containing file dependencies.
   */
  private buildDependencyGraph(jsonData: {
    files: Record<string, { dependsOn: string[] }>;
  }): { graph: [string, string][]; nodes: Set<string> } {
    const graph: [string, string][] = [];
    const nodes = new Set<string>();

    Object.entries(jsonData.files).forEach(([fileName, details]) => {
      nodes.add(fileName);
      details.dependsOn.forEach((dep) => {
        const resolvedDep = this.resolveDependency(fileName, dep);
        graph.push([resolvedDep, fileName]); // [dependency, dependent]
        nodes.add(resolvedDep);
      });
    });

    return { graph, nodes };
  }

  /**
   * Detect cycles in the dependency graph before any file operations.
   * @param graph The dependency graph to check.
   * @throws Error if a cycle is detected.
   */
  private detectCycles(graph: [string, string][]): void {
    try {
      toposort(graph);
    } catch (error) {
      if (error.message.includes('cycle')) {
        throw new Error(
          `Circular dependency detected in the file structure: ${error.message}`,
        );
      }
      throw error;
    }
  }

  /**
   * Get topologically sorted list of files.
   * @param graph The dependency graph.
   * @param nodes Set of all nodes.
   */
  private getSortedFiles(
    graph: [string, string][],
    nodes: Set<string>,
  ): string[] {
    const sortedFiles = toposort(graph).reverse();

    // Add any files that have no dependencies and weren't included in the sort
    Array.from(nodes).forEach((node) => {
      if (!sortedFiles.includes(node)) {
        sortedFiles.unshift(node);
      }
    });

    return sortedFiles;
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
   * Validate that all files and dependencies exist in the virtual directory structure
   * @param nodes Set of all files and dependencies
   * @throws Error if any file or dependency is not found in the virtual directory
   */
  private validateAgainstVirtualDirectory(nodes: Set<string>): void {
    const invalidFiles: string[] = [];

    nodes.forEach((filePath) => {
      if (!this.virtualDir.isValidFile(filePath)) {
        invalidFiles.push(filePath);
      }
    });

    if (invalidFiles.length > 0) {
      throw new Error(
        `The following files do not exist in the project structure:\n${invalidFiles.join('\n')}`,
      );
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
