/**
 * FileOperationManager.ts
 *
 * This file defines:
 * 1) An interface `FileOperation` to describe
 *    how a file operation request should look.
 * 2) A class `FileOperationManager` that implements
 *    the logic for performing write, rename, and
 *    read operations on files, with safety checks
 *    to prevent unauthorized or dangerous file access.
 */

import { Logger } from '@nestjs/common';
import { writeFile, rename, readFile } from 'fs/promises';
import path from 'path';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import { FilePathSafetyChecks } from 'src/build-system/utils/security/path-check';

export interface FileOperation {
  action: 'write' | 'rename' | 'read';
  originalPath?: string;
  renamePath?: string;
  code?: string;
  paths?: string[];
}

/**
 * Manages file operations such as 'write', 'rename', and 'read'.
 * parses JSON input to extract operations.
 * Also enforces safety checks to prevent unauthorized access or edits.
 */
export class FileOperationManager {
  private readonly projectRoot: string;
  private readonly allowedPaths: string[];
  private logger = new Logger('FileOperationManager');

  constructor(
    projectRoot: string,
    private renameMap: Map<string, string>,
  ) {
    this.projectRoot = path.normalize(projectRoot);
    this.allowedPaths = [this.projectRoot];
  }

  /**
   * Executes an array of file operations sequentially.
   *
   * @param operations - An array of operations to perform.
   * @returns The final "renamePath" if any file was renamed, or null otherwise.
   */
  async executeOperations(operations: FileOperation[]): Promise<string | null> {
    let newFilePath: string | null = null;

    for (const op of operations) {
      try {
        switch (op.action) {
          case 'write':
            await this.handleWrite(op);
            break;
          case 'rename':
            await this.handleRename(op);
            newFilePath = op.renamePath || null;

            // add new file path
            if (op.originalPath && op.renamePath) {
              // **Check if originalPath was previously renamed**
              const latestPath =
                this.renameMap.get(op.originalPath) || op.originalPath;

              // **Update mapping for the latest renamed file**
              this.renameMap.set(latestPath, op.renamePath);
            }
            break;
          case 'read':
            // We could implement a read action here if needed.
            // await this.handleRead(op);
            break;
        }
      } catch (error) {
        this.logger.error(
          `Failed to ${op.action} ${op.originalPath}: ${error}`,
        );
        throw error;
      }
    }

    return newFilePath;
  }

  /**
   * Handles the 'write' action: writes the given code string to the file.
   *
   * @param op - A FileOperation containing `originalPath` and `code`.
   */
  private async handleWrite(op: FileOperation): Promise<void> {
    const originalPath = path.resolve(this.projectRoot, op.originalPath);
    const securityOptions = { projectRoot: this.projectRoot };
    FilePathSafetyChecks(originalPath, securityOptions);

    this.logger.debug('start update file to: ' + originalPath);
    const parseCode = removeCodeBlockFences(op.code);
    await writeFile(originalPath, parseCode, 'utf-8');
  }

  /**
   * Handles the 'read' action: reads a file from disk.
   *
   * @param op - A FileOperation containing `originalPath`.
   * @returns The file content as a string, or null if it fails to read.
   */
  private async handleRead(op: FileOperation): Promise<string | null> {
    try {
      const originalPath = path.resolve(this.projectRoot, op.originalPath);
      const securityOptions = { projectRoot: this.projectRoot };
      FilePathSafetyChecks(originalPath, securityOptions);

      this.logger.debug(`Reading file: ${originalPath}`);

      // Read the file content
      const fileContent = await readFile(originalPath, 'utf-8');

      this.logger.debug(`File read successfully: ${originalPath}`);

      return fileContent;
    } catch (error) {
      this.logger.error(
        `Failed to read file: ${op.originalPath}, Error: ${error.message}`,
      );
      return null; // Return null if the file cannot be read
    }
  }

  /**
   * Handles the 'rename' action: moves or renames a file.
   *
   * @param op - A FileOperation containing `originalPath` and `renamePath`.
   */
  private async handleRename(op: FileOperation): Promise<void> {
    const originalPath = path.resolve(this.projectRoot, op.originalPath);
    const RenamePath = path.resolve(this.projectRoot, op.renamePath);
    const securityOptions = { projectRoot: this.projectRoot };

    FilePathSafetyChecks(originalPath, securityOptions);
    FilePathSafetyChecks(RenamePath, securityOptions);

    this.logger.debug('start rename: ' + originalPath);
    this.logger.debug('change to name: ' + RenamePath);
    // Perform the actual rename
    await rename(originalPath, RenamePath);
  }

  /**
   * Parses JSON output (e.g., from an LLM) to build an array of FileOperations.
   * This is often used when GPT provides structured instructions to
   * read/write/rename files.
   *
   * input example:
   *  {
   *    "fix": {
   *      "operation": {
   *         "type": "READ",
   *        "paths": ["src/path/to/file1.tsx", "src/path/to/file2.ts"]
   *     }
   *  }
   *  }
   *
   * @param json     - The JSON string containing the fix/operation details.
   * @param filePath - The path of the file we’re primarily fixing (if any).
   * @returns An array of FileOperation objects.
   */
  parse(json: string, filePath: string): FileOperation[] {
    this.logger.log('Parsing JSON:', json);

    let parsedData;
    try {
      parsedData = JSON.parse(json);
    } catch (error) {
      this.logger.error('Error parsing JSON:', error);
      throw new Error('Invalid JSON format');
    }

    if (!parsedData.fix || !parsedData.fix.operation) {
      throw new Error("Invalid JSON structure: Missing 'fix.operations'");
    }

    const op = parsedData.fix.operation;
    const operations: FileOperation[] = [];

    if (op.type === 'WRITE') {
      operations.push({
        action: 'write',
        originalPath: filePath,
        code: op.content?.trim(),
      });
    } else if (op.type === 'RENAME') {
      operations.push({
        action: 'rename',
        originalPath: op.original_path,
        renamePath: op.path,
      });
    } else if (op.type === 'READ' && Array.isArray(op.paths)) {
      for (const path of op.paths) {
        operations.push({
          action: 'read',
          originalPath: path,
        });
      }
    }

    // this.logger.log('Extracted operations:', operations);
    return operations;
  }
}
