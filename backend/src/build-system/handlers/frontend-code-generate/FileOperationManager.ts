import { Logger } from '@nestjs/common';
import { writeFile, rename } from 'fs/promises';
import path from 'path';

export interface FileOperation {
  action: 'write' | 'rename';
  originalPath?: string;
  renamePath?: string;
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
      try {
        switch (op.action) {
          case 'write':
            await this.handleWrite(op);
            break;
          case 'rename':
            await this.handleRename(op);
            break;
        }
      } catch (error) {
        this.logger.error(
          `Failed to ${op.action} ${op.originalPath}: ${error}`,
        );
        throw error;
      }
    }
  }

  private async handleWrite(op: FileOperation): Promise<void> {
    const originalPath = path.resolve(this.projectRoot, op.originalPath);
    this.safetyChecks(originalPath);

    this.logger.debug('start update file to: ' + originalPath);
    await writeFile(originalPath, op.code, 'utf-8');
  }

  private async handleRename(op: FileOperation): Promise<void> {
    const originalPath = path.resolve(this.projectRoot, op.originalPath);
    const RenamePath = path.resolve(this.projectRoot, op.renamePath);

    this.safetyChecks(originalPath);
    this.safetyChecks(RenamePath);

    this.logger.debug('start rename: ' + originalPath);
    this.logger.debug('change to name: ' + RenamePath);
    // Perform the actual rename
    await rename(originalPath, RenamePath);
  }

  private safetyChecks(filePath: string) {
    const targetPath = path.resolve(this.projectRoot, filePath); // Normalize path

    // Prevent path traversal attacks
    if (!targetPath.startsWith(this.projectRoot)) {
      throw new Error('Unauthorized file access detected');
    }

    // Prevent package.json modifications
    if (targetPath.includes('package.json')) {
      throw new Error('Modifying package.json requires special approval');
    }

    // Security check
    if (!this.isPathAllowed(targetPath)) {
      throw new Error(`Attempted to access restricted path: ${targetPath}`);
    }

    // Limit write anddelete write operations
    // if (path.startsWith('src/')) {
    //   throw new Error('Can only delete or write files in src/ directory');
    // }
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
