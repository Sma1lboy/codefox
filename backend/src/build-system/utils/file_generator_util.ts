import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '@nestjs/common';
import { VirtualDirectory } from '../virtual-dir';
import { extractJsonFromMarkdown } from 'src/build-system/utils/strings';
import normalizePath from 'normalize-path';
import toposort from 'toposort';

const logger = new Logger('FileGeneratorUtil');
let virtualDir: VirtualDirectory;

/**
 * Generates files based on JSON extracted from a Markdown document.
 * Ensures dependency order is maintained during file creation.
 */
export async function generateFiles(
  markdownContent: string,
  projectSrcPath: string,
  virtualDirectory: VirtualDirectory,
): Promise<void> {
  virtualDir = virtualDirectory;
  const jsonData = extractJsonFromMarkdown(markdownContent);

  const { graph, nodes } = buildDependencyGraph(jsonData);
  detectCycles(graph);
  validateAgainstVirtualDirectory(nodes);

  const sortedFiles = getSortedFiles(graph, nodes);

  for (const file of sortedFiles) {
    const fullPath = normalizePath(path.resolve(projectSrcPath, file));
    logger.log(`Generating file in dependency order: ${fullPath}`);
    await createFile(fullPath);
  }

  logger.log('All files generated successfully.');
}

/**
 * Constructs a dependency graph from the provided JSON structure.
 * Each file entry includes dependencies that must be resolved first.
 */
export function buildDependencyGraph(jsonData: {
  files: Record<string, { dependsOn: string[] }>;
}): { graph: [string, string][]; nodes: Set<string> } {
  const graph: [string, string][] = [];
  const nodes = new Set<string>();

  logger.log('Parsing JSON data to build dependency graph');

  Object.entries(jsonData.files).forEach(([fileName, details]) => {
    nodes.add(fileName);
    details.dependsOn.forEach((dep) => {
      const resolvedDep = resolveDependency(fileName, dep);
      graph.push([resolvedDep, fileName]);
      nodes.add(resolvedDep);
    });
  });

  return { graph, nodes };
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
  const sortedFiles = toposort(graph).reverse();

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
export function validateAgainstVirtualDirectory(nodes: Set<string>): void {
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
}

/**
 * Creates a file at the specified path, ensuring required directories exist first.
 * The file is created with a simple placeholder comment.
 */
export async function createFile(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  const content = `// Generated file: ${path.basename(filePath)}`;
  await fs.writeFile(filePath, content, 'utf8');

  logger.log(`File created: ${filePath}`);
}
