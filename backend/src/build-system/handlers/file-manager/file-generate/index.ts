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
  InvalidParameterError,
  ResponseParsingError,
  FileWriteError,
} from 'src/build-system/errors';

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
      throw new InvalidParameterError(
        'Missing required parameter: fileArchDoc.',
      );
    }

    const projectSrcPath = getProjectPath(uuid);

    try {
      await this.generateFiles(fileArchDoc, projectSrcPath);
      this.logger.log('All files generated successfully.');
      return {
        success: true,
        data: 'Files and dependencies created successfully.',
      };
    } catch (error) {
      throw error;
    }
  }

  async generateFiles(
    markdownContent: string,
    projectSrcPath: string,
  ): Promise<void> {
    const jsonData = extractJsonFromMarkdown(markdownContent);

    if (!jsonData || !jsonData.files) {
      this.logger.error('Invalid or empty file architecture data.');
      throw new ResponseParsingError(
        'Invalid or empty file architecture data.',
      );
    }

    const { graph, nodes } = this.buildDependencyGraph(jsonData);

    try {
      this.detectCycles(graph);
    } catch (error) {
      this.logger.error('Circular dependency detected.', error);
      throw new InvalidParameterError(
        `Circular dependency detected: ${error.message}`,
      );
    }

    try {
      this.validateAgainstVirtualDirectory(nodes);
    } catch (error) {
      this.logger.error('Validation against virtual directory failed.', error);
      throw new InvalidParameterError(error.message);
    }

    const sortedFiles = this.getSortedFiles(graph, nodes);

    for (const file of sortedFiles) {
      const fullPath = normalizePath(path.resolve(projectSrcPath, file));
      this.logger.log(`Generating file in dependency order: ${fullPath}`);
      try {
        await this.createFile(fullPath);
      } catch (error) {
        throw new FileWriteError(`Failed to create file: ${file}`);
      }
    }
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
        graph.push([resolvedDep, fileName]);
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
        throw new InvalidParameterError(
          `Circular dependency detected: ${error.message}`,
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
      throw new InvalidParameterError(
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
