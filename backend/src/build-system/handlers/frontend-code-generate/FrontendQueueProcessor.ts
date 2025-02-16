import { Logger } from '@nestjs/common';
import { FrontendCodeValidator } from './FrontendCodeValidator';
import { CodeTaskQueue, FileTask } from './CodeTaskQueue';
import { readFileSync } from 'fs';
import { chatSyncWithClocker } from 'src/build-system/utils/handler-helper';
import { createFileWithRetries } from 'src/build-system/utils/files';
import { BuilderContext } from 'src/build-system/context';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import {
  generateCommonErrorPrompt,
  generateFileOperationPrompt,
} from './prompt';
import { FileOperationManager } from './FileOperationManager';
import { FixResponseParser } from './FixResponseParser';

import normalizePath from 'normalize-path';
import path from 'path';

export class FrontendQueueProcessor {
  private logger = new Logger('FrontendQueueProcessor');

  constructor(
    private validator: FrontendCodeValidator, // Path to your frontend project
    private queue: CodeTaskQueue, // The queue of files to process
    private context: BuilderContext,
    private frontendPath: string,
    private renameMap: Map<string, string>,
  ) {}

  /**
   * Process the entire queue, one file at a time.
   */
  public async processAllTasks(): Promise<void> {
    while (this.queue.size > 0) {
      const task = this.queue.dequeue();
      if (!task) break;

      await this.processSingleTask(task);

      this.logger.log(`Remaining tasks in queue: ${this.queue.size}`);
    }

    // maybe need to requeue

    this.logger.log('All tasks processed successfully!');
  }

  /**
   * For a single file:
   * 1. Write it to disk
   * 2. Run "npm run build" (through the validator)
   * 3. If error -> try to fix -> repeat until success or max attempts.
   */
  private async processSingleTask(task: FileTask): Promise<void> {
    this.logger.log(`Processing file task: ${task.filePath}`);

    let currentFullFilePath = normalizePath(
      path.resolve(this.frontendPath, task.filePath),
    );

    // 1. Write the file to disk
    createFileWithRetries(currentFullFilePath, task.fileContents);

    const maxFixAttempts = 2;

    for (let attempt = 1; attempt <= maxFixAttempts; attempt++) {
      const validationResult = await this.validator.validate();

      if (validationResult.success) {
        this.logger.log(
          `File ${task.filePath} build succeeded on attempt #${attempt}.`,
        );
        return; // done, move on
      }

      // Build failed. We'll feed the entire `validationResult.error` back to GPT
      //   this.logger.warn(
      //     `Build failed on attempt #${attempt} for file ${task.filePath}. Error:\n${validationResult.error}`,
      //   );

      this.logger.warn(
        `Build failed on attempt #${attempt} for file ${task.filePath}.`,
      );

      // 3. Fix the file
      try {
        const newFilePath = await this.fixFileGeneric(
          currentFullFilePath,
          task,
          validationResult.error ?? '',
        );

        if (newFilePath !== null) {
          this.logger.log(
            `File was renamed: ${task.filePath} → ${newFilePath}`,
          );
          task.filePath = newFilePath;
          currentFullFilePath = normalizePath(
            path.resolve(this.frontendPath, newFilePath),
          );
          this.logger.log(
            `Updated currentFullFilePath: ${currentFullFilePath}`,
          );
        }
      } catch (error) {
        this.logger.error(
          'Fix File Generic failed, get error: ' + error.messages,
        );
      }
    }

    // If we reached here, we failed all attempts
    // if we want to end all generate
    // throw new Error(
    //   `Failed to fix build for file ${task.filePath} after ${maxFixAttempts} attempts.`,
    // );

    // if we dont want to end the process
    this.logger.error(
      `Failed to fix build for file ${task.filePath} after ${maxFixAttempts} attempts.`,
    );
  }

  /**
   * Fallback if you have no structured error details.
   */
  private async fixFileGeneric(
    currentFullFilePath: string,
    task: FileTask,
    rawErrorText: string,
  ): Promise<string | null> {
    try {
      this.logger.log(`Generic fix attempt for file: ${currentFullFilePath}`);
      const originalContent = readFileSync(currentFullFilePath, 'utf-8');

      this.logger.debug('raw error: ' + rawErrorText);

      const fixPrompt = generateFileOperationPrompt(task.filePath);
      const commonIssuePrompt = generateCommonErrorPrompt();

      const fileOperationManager = new FileOperationManager(
        this.frontendPath,
        this.renameMap,
      );
      const parser = new FixResponseParser();

      //this.logger.log(fixPrompt);

      // Use model for a fix
      let fixResponse = await chatSyncWithClocker(
        this.context,
        {
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: fixPrompt },
            {
              role: 'user',
              content: ` ## Current file: \n ${task.filePath} ## Current Code \n ${originalContent}\n `,
            },
            {
              role: 'user',
              content: ` ##  Error Messages: \n ${rawErrorText}`,
            },
            {
              role: 'assistant',
              content:
                "Good, now provider your dependencies, it's okay dependencies are empty, which means you don't have any dependencies",
            },
            {
              role: 'user',
              content: `## Overview of The Internal Dependencies file you may need: \n ${task.dependenciesPath}`,
            },
            {
              role: 'assistant',
              content: `Let me analysis the current file. Why error message occour?
            Let me check some common issue to make sure my thinking is correct ${commonIssuePrompt}.
            I must follow the output format`,
            },
            {
              role: 'user',
              content: `Now you should start fix the current code error.`,
            },
            {
              role: 'assistant',
              content: `Let me check my result and I must follow the output format`,
            },
          ],
        },
        'fix code (generic)',
        'FrontendQueueProcessor',
      );

      this.logger.debug('Fix Response: ' + fixResponse);
      this.logger.debug('dependency file Paths ' + task.dependenciesPath);
      const parsed_fixResponse = removeCodeBlockFences(fixResponse);

      let operations = parser.parse(parsed_fixResponse, task.filePath);

      // **If LLM requested additional files, read them**
      if (operations.some((op) => op.action === 'read')) {
        this.logger.log(
          `LLM requested additional context. Reading dependencies...`,
        );

        for (const op of operations) {
          if (op.action === 'read' && op.originalPath) {
            try {
              op.code = readFileSync(
                path.resolve(this.frontendPath, op.originalPath),
                'utf-8',
              );
              this.logger.log(`Read file: ${op.originalPath}`);
            } catch (error) {
              this.logger.warn(
                `Failed to read file: ${op.originalPath}. Error: ${error.message}`,
              );
            }
          }
        }

        // **Second Attempt: Retry fix with additional file content**
        fixResponse = await chatSyncWithClocker(
          this.context,
          {
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: fixPrompt },
              {
                role: 'user',
                content: `## Current Code \n ${originalContent}\n `,
              },
              {
                role: 'user',
                content: `## Error messages: \n ${rawErrorText}`,
              },
              {
                role: 'assistant',
                content:
                  "Good, now provider your Internal dependencies, it's okay dependencies are empty, which means you don't have any dependencies",
              },
              {
                role: 'user',
                content: `## Overview of Internal Dependencies files: \n ${task.dependenciesPath}\n
                ## Internal Dependencies files content:\n ${operations
                  .filter((op) => op.action === 'read' && op.code)
                  .map((op) => `File: ${op.originalPath}\nContent:\n${op.code}`)
                  .join('\n\n')}`,
              },
              {
                role: 'assistant',
                content: `Let me analysis the current file. Why error message occour
              This time I shouldn't use the read tool because previous context already use it.
              Let me check some common issue to make sure my thinking is correct ${commonIssuePrompt}.
              I must follow the output format`,
              },
              {
                role: 'user',
                content: `Now you should start fix the current code error.`,
              },
              {
                role: 'assistant',
                content: `Let me check my result and I must follow the output format`,
              },
            ],
          },
          'fix code (generic)',
          'FrontendQueueProcessor',
        );
        this.logger.debug(
          'Updated Fix Response with extra context: ' + fixResponse,
        );
        const updated_fixResponse = removeCodeBlockFences(fixResponse);
        operations = await parser.parse(updated_fixResponse, task.filePath);
      }

      const newFilePath =
        await fileOperationManager.executeOperations(operations);

      this.logger.log(`Generic fix applied to file: ${task.filePath}`);

      if (newFilePath) {
        this.logger.log(`File was renamed: ${task.filePath} → ${newFilePath}`);
        return newFilePath;
      }

      return null;
    } catch (error) {
      this.logger.error('Generic Fix file: ' + error.message);
      return null;
    }
  }
}
