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
    private queue: CodeTaskQueue,
    private context: BuilderContext, // The queue of files to process
    private frontendPath: string,
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

    const currentFullFilePath = normalizePath(
      path.resolve(this.frontendPath, task.filePath),
    );

    // 1. Write the file to disk
    createFileWithRetries(currentFullFilePath, task.fileContents);

    const maxFixAttempts = 3;

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
        await this.fixFileGeneric(
          currentFullFilePath,
          task.filePath,
          validationResult.error ?? '',
          task.dependenciesPath,
        );
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
    filePath: string,
    rawErrorText: string,
    dependenciesPath: string,
  ) {
    try {
      this.logger.log(`Generic fix attempt for file: ${currentFullFilePath}`);
      const originalContent = readFileSync(currentFullFilePath, 'utf-8');

      const fixPrompt = generateFileOperationPrompt();
      const commonIssuePrompt = generateCommonErrorPrompt();

      const fileOperationManager = new FileOperationManager(this.frontendPath);
      const parser = new FixResponseParser();

      //this.logger.log(fixPrompt);

      // Use model for a fix
      const fixResponse = await chatSyncWithClocker(
        this.context,
        {
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: fixPrompt },
            {
              role: 'user',
              content: ` Current file path that need to be fix: \n ${filePath}`,
            },
            { role: 'user', content: ` Error messages: \n ${rawErrorText}` },
            {
              role: 'user',
              content: ` dependency file Paths: \n ${dependenciesPath}`,
            },
            {
              role: 'user',
              content: ` originalContent: \n ${originalContent}\n Now please start fix the problem and generate the result based on system prompt`,
            },
            {
              role: 'assistant',
              content: `Do this really fix the provide code? 
            Let me check some common issue to make sure my answer is correct ${commonIssuePrompt}. If not I should modify the result.
            If i am using rename tool am i use the correct Current file path for it?
            I must follow the output format.`,
            },
          ],
        },
        'fix code (generic)',
        'FrontendQueueProcessor',
      );

      this.logger.debug('Fix Response: ' + fixResponse);
      this.logger.debug('dependency file Paths ' + dependenciesPath);
      const parsed_fixResponse = removeCodeBlockFences(fixResponse);

      const operations = parser.parse(parsed_fixResponse, filePath);

      await fileOperationManager.executeOperations(operations);

      this.logger.log(`Generic fix applied to file: ${filePath}`);
    } catch (error) {
      this.logger.error('Generic Fix file: ' + error.message);
    }
  }
}
