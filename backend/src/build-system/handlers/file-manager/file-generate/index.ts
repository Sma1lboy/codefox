import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '@nestjs/common';
import { VirtualDirectory } from '../../../virtual-dir';
import { BuilderContext } from 'src/build-system/context';
import { BuildHandler, BuildResult } from 'src/build-system/types';
import { extractJsonFromMarkdown } from 'src/build-system/utils/strings';
import { getProjectPath } from 'src/config/common-path';
import normalizePath from 'normalize-path';
import toposort from 'toposort';
import {
  RetryableError,
  NonRetryableError,
} from 'src/build-system/retry-handler';

export class FileGeneratorHandler implements BuildHandler<string> {
  readonly id = 'op:FILE:GENERATE';
  private readonly logger = new Logger('FileGeneratorHandler');
  private virtualDir: VirtualDirectory;

  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.virtualDir = context.virtualDirectory;
    const fileArchDoc = context.getNodeData('op:FILE:ARCH');
    const uuid = context.getGlobalContext('projectUUID');

    if (!fileArchDoc) {
      this.logger.error('File architecture document is missing.');
      return {
        success: false,
        error: new NonRetryableError(
          'Missing required parameter: fileArchDoc.',
        ),
      };
    }

    const projectSrcPath = getProjectPath(uuid);

    try {
      await this.generateFiles(fileArchDoc, projectSrcPath);
    } catch (error) {
      if (error instanceof RetryableError) {
        this.logger.warn(`Retryable error encountered: ${error.message}`);
        return {
          success: false,
          error,
        };
      }

      this.logger.error(
        'Non-retryable error encountered during file generation:',
        error,
      );
      return {
        success: false,
        error: new NonRetryableError(
          'Failed to generate files and dependencies.',
        ),
      };
    }

    return {
      success: true,
      data: 'Files and dependencies created successfully.',
    };
  }

  async generateFiles(
    markdownContent: string,
    projectSrcPath: string,
  ): Promise<void> {
    const jsonData = extractJsonFromMarkdown(markdownContent);
    if (!jsonData || !jsonData.files) {
      throw new RetryableError('Invalid or empty file architecture data.');
    }

    const { graph, nodes } = this.buildDependencyGraph(jsonData);

    try {
      this.detectCycles(graph);
    } catch (error) {
      throw new NonRetryableError(
        `Circular dependency detected: ${error.message}`,
      );
    }

    try {
      this.validateAgainstVirtualDirectory(nodes);
    } catch (error) {
      throw new NonRetryableError(error.message);
    }

    const sortedFiles = this.getSortedFiles(graph, nodes);

    for (const file of sortedFiles) {
      const fullPath = normalizePath(path.resolve(projectSrcPath, file));
      this.logger.log(`Generating file in dependency order: ${fullPath}`);
      try {
        await this.createFile(fullPath);
      } catch (error) {
        throw new RetryableError(`Failed to create file: ${file}`);
      }
    }

    this.logger.log('All files generated successfully.');
  }

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

  private getSortedFiles(
    graph: [string, string][],
    nodes: Set<string>,
  ): string[] {
    const sortedFiles = toposort(graph).reverse();

    Array.from(nodes).forEach((node) => {
      if (!sortedFiles.includes(node)) {
        sortedFiles.unshift(node);
      }
    });

    return sortedFiles;
  }

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

  private async createFile(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);

    await fs.mkdir(dir, { recursive: true });

    const content = `// Generated file: ${path.basename(filePath)}`;
    await fs.writeFile(filePath, content, 'utf8');

    this.logger.log(`File created: ${filePath}`);
  }
}
