import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '@nestjs/common';
import { VirtualDirectory } from '../virtual-dir';
import { extractJsonFromMarkdown } from 'src/build-system/utils/strings';
import toposort from 'toposort';

interface FileDependencyInfo {
  filePath: string;
  dependsOn: string[];
}

interface GenerateFilesDependencyResult {
  sortedFiles: string[];
  fileInfos: Record<string, FileDependencyInfo>;
}

const logger = new Logger('FileGeneratorUtil');

/**
 * Generates files based on JSON extracted from a Markdown document.
 * Ensures dependency order is maintained during file creation.
 */
export async function generateFilesDependency(
  markdownContent: string,
  virtualDirectory: VirtualDirectory,
): Promise<GenerateFilesDependencyResult> {
  const jsonData = extractJsonFromMarkdown(markdownContent);

  const { graph, nodes, fileInfos } = buildDependencyGraph(jsonData);
  detectCycles(graph);
  validateAgainstVirtualDirectory(nodes, virtualDirectory);

  const sortedFiles = getSortedFiles(graph, nodes);

  logger.log('All files dependency generated successfully.');

  return {
    sortedFiles,
    fileInfos,
  };
}

/**
 * Constructs a dependency graph from the provided JSON structure.
 * Each file entry includes dependencies that must be resolved first.
 */
export function buildDependencyGraph(jsonData: {
  files: Record<string, { dependsOn: string[] }>;
}): {
  graph: [string, string][];
  nodes: Set<string>;
  fileInfos: Record<string, { filePath: string; dependsOn: string[] }>;
} {
  const graph: [string, string][] = [];
  const nodes = new Set<string>();
  const fileInfos: Record<string, { filePath: string; dependsOn: string[] }> =
    {};

  logger.log('Parsing JSON data to build dependency graph');

  Object.entries(jsonData.files).forEach(([fileName, details]) => {
    nodes.add(fileName);

    // store file info
    fileInfos[fileName] = {
      filePath: fileName,
      dependsOn: [],
    };

    details.dependsOn.forEach((dep) => {
      const resolvedDep = resolveDependency(fileName, dep);
      graph.push([resolvedDep, fileName]); // [dependency, dependent]
      nodes.add(resolvedDep);

      // store dependsOn
      fileInfos[fileName].dependsOn.push(resolvedDep);
    });
  });

  return { graph, nodes, fileInfos };
}

/**
 * Detects cycles in the dependency graph to prevent infinite loops.
 */
export function detectCycles(graph: [string, string][]): void {
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
 * Performs a topological sort on the dependency graph and ensures all files are ordered correctly.
 */
export function getSortedFiles(
  graph: [string, string][],
  nodes: Set<string>,
): string[] {
  const sortedFiles = toposort(graph);

  Array.from(nodes).forEach((node) => {
    if (!sortedFiles.includes(node)) {
      sortedFiles.unshift(node);
    }
  });

  return sortedFiles;
}

/**
 * Resolves dependency paths relative to the current file.
 * Adds an index file extension if missing.
 */
export function resolveDependency(
  currentFile: string,
  dependency: string,
): string {
  const currentDir = path.dirname(currentFile);
  const hasExtension = path.extname(dependency).length > 0;

  if (!hasExtension) {
    dependency = path.join(dependency, 'index.ts');
  }

  const resolvedPath = path.join(currentDir, dependency).replace(/\\/g, '/');
  logger.log(`Resolved dependency: ${resolvedPath}`);
  return resolvedPath;
}

/**
 * Validates that all dependencies exist within the virtual directory structure before file generation.
 */
export function validateAgainstVirtualDirectory(
  nodes: Set<string>,
  virtualDir: VirtualDirectory,
): boolean {
  const invalidFiles: string[] = [];

  nodes.forEach((filePath) => {
    if (!virtualDir.isValidFile(filePath)) {
      invalidFiles.push(filePath);
    }
  });

  if (invalidFiles.length > 0) {
    throw new Error(
      `The following files do not exist in the project structure:\n${invalidFiles.join('\n')}`,
    );
  }
  return true;
}

/**
 * Creates a file at the specified path, ensuring required directories exist first.
 * The file is created with a simple placeholder comment.
 */
export async function createFile(
  filePath: string,
  generatedCode: string,
): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  await fs.writeFile(filePath, generatedCode, 'utf8');

  logger.log(`File created: ${filePath}`);
}
