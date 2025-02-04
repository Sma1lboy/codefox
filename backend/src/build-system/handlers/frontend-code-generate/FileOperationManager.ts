import { Logger } from '@nestjs/common';
import { writeFile, rename } from 'fs/promises';
import path from 'path';

export interface FileOperation {
  action: 'read' | 'write' | 'delete' | 'rename';
  path: string;
  originalPath: string;
  content?: string;
  purpose?: string;
}

export interface LLMFixResponse {
  operations: FileOperation[];
  reasoning: string;
  code?: string;
}

export class FileOperationManager {
  private readonly projectRoot: string;
  private readonly allowedPaths: string[];
  private logger = new Logger('FileOperationManager');

  constructor(projectRoot: string) {
    this.projectRoot = path.normalize(projectRoot);
    this.allowedPaths = [this.projectRoot];
  }

  private operationCount = 0;
  async executeOperations(operations: FileOperation[]): Promise<void> {
    // if (operations.length > 5) {
    //   throw new Error('Maximum 5 operations per fix');
    // }

    for (const op of operations) {
      const resolvedPath = path.resolve(this.projectRoot, op.path);

      try {
        switch (op.action) {
          case 'write':
            await this.handleWrite(resolvedPath, op);
            break;
          case 'rename':
            await this.handleRename(resolvedPath, op);
            break;
        }
      } catch (error) {
        this.logger.error(`Failed to ${op.action} ${resolvedPath}: ${error}`);
        throw error;
      }
    }
  }

  private async handleWrite(
    filePath: string,
    op: FileOperation,
  ): Promise<void> {
    this.safetyChecks(op);
    await writeFile(filePath, op.content, 'utf-8');
  }

  private async handleRename(
    filePath: string,
    op: FileOperation,
  ): Promise<void> {
    this.safetyChecks(op);

    // Perform the actual rename
    await rename(op.originalPath, filePath);
  }

  private safetyChecks(op: FileOperation) {
    const targetPath = path.resolve(this.projectRoot, op.path); // Normalize path

    // Prevent path traversal attacks
    if (!targetPath.startsWith(this.projectRoot)) {
      throw new Error('Unauthorized file access detected');
    }

    // Prevent package.json modifications
    if (op.path.includes('package.json')) {
      throw new Error('Modifying package.json requires special approval');
    }

    // Security check
    if (!this.isPathAllowed(targetPath)) {
      throw new Error(`Attempted to access restricted path: ${targetPath}`);
    }

    // Limit delete write operations
    if (
      (op.action === 'delete' || op.action === 'write') &&
      !op.path.startsWith('src/')
    ) {
      throw new Error('Can only delete or write files in src/ directory');
    }
  }

  private isPathAllowed(targetPath: string): boolean {
    return this.allowedPaths.some(
      (allowedPath) =>
        targetPath.startsWith(allowedPath) &&
        !targetPath.includes('node_modules') &&
        !targetPath.includes('.env'),
    );
  }
}
