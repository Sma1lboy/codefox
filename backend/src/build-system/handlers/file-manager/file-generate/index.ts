import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '@nestjs/common';
import * as toposort from 'toposort';
import { VirtualDirectory } from '../../../virtual-dir';
import { BuilderContext } from 'src/build-system/context';
import { BuildHandler, BuildResult } from 'src/build-system/types';
import { extractJsonFromMarkdown } from 'src/build-system/utils/strings';
import { getProjectPath } from 'src/config/common-path';
import normalizePath from 'normalize-path';

export class FileGeneratorHandler implements BuildHandler<string> {
  readonly id = 'op:FILE:GENERATE';
  private readonly logger = new Logger('FileGeneratorHandler');
  private virtualDir: VirtualDirectory;

  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.virtualDir = context.virtualDirectory;
    const fileArchDoc = context.getNodeData('op:FILE:ARCH');
    const uuid = context.getGlobalContext('projectUUID');

    const projectSrcPath = getProjectPath(uuid);

    try {
      await this.generateFiles(fileArchDoc, projectSrcPath);
    } catch (error) {
      this.logger.error('Error during file generation process', error);
      return {
        success: false,
        error: new Error('Failed to generate files and dependencies.'),
      };
    }

    return {
      success: true,
      data: 'Files and dependencies created successfully.',
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
  ): Promise<void> {
    const jsonData = extractJsonFromMarkdown(markdownContent);

    // Build the dependency graph and detect cycles before any file operations
    const { graph, nodes } = this.buildDependencyGraph(jsonData);
    this.detectCycles(graph);

    // Validate files against the virtual directory structure
    this.validateAgainstVirtualDirectory(nodes);

    // Perform topological sort for file generation
    const sortedFiles = this.getSortedFiles(graph, nodes);

    // Generate files in dependency order
    for (const file of sortedFiles) {
      const fullPath = normalizePath(path.resolve(projectSrcPath, file));
      this.logger.log(`Generating file in dependency order: ${fullPath}`);
      await this.createFile(fullPath);
    }

    this.logger.log('All files generated successfully.');
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
   * Detect cycles in the dependency graph.
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

    // Add any files with no dependencies
    Array.from(nodes).forEach((node) => {
      if (!sortedFiles.includes(node)) {
        sortedFiles.unshift(node);
      }
    });

    return sortedFiles;
  }

  /**
   * Resolve a dependency path relative to the current file.
   * @param currentFile The current file's path.
   * @param dependency The dependency path.
   */
  private resolveDependency(currentFile: string, dependency: string): string {
    const currentDir = path.dirname(currentFile);
    const hasExtension = path.extname(dependency).length > 0;

    if (!hasExtension) {
      dependency = path.join(dependency, 'index.ts');
    }

    const resolvedPath = path.join(currentDir, dependency).replace(/\\/g, '/');
    this.logger.log(`Resolved dependency: ${resolvedPath}`);
    return resolvedPath;
  }

  /**
   * Validate all files and dependencies against the virtual directory.
   * @param nodes Set of all files and dependencies.
   * @throws Error if any file or dependency is not valid.
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
