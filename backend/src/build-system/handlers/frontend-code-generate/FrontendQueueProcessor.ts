import { Logger } from '@nestjs/common';
import { FrontendCodeValidator } from './FrontendCodeValidator';
import { CodeTaskQueue, FileTask } from './CodeTaskQueue';
import { readFileSync } from 'fs';
import { chatSyncWithClocker } from 'src/build-system/utils/handler-helper';
import { createFileWithRetries } from 'src/build-system/utils/files';
import { BuilderContext } from 'src/build-system/context';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import { generateFileOperationPrompt } from './prompt';
import { FileOperationManager } from './FileOperationManager';
import { FixResponseParser } from './FixResponseParser';

export class FrontendQueueProcessor {
  private logger = new Logger('FrontendQueueProcessor');

  constructor(
    private validator: FrontendCodeValidator, // Path to your frontend project
    private queue: CodeTaskQueue,
    private context: BuilderContext, // The queue of files to process
  ) {}

  /**
   * Process the entire queue, one file at a time.
   */
  public async processAllTasks(): Promise<void> {
    while (this.queue.size > 0) {
      const task = this.queue.dequeue();
      if (!task) break;

      // this.logger.debug('Task name: ' + task.filePath);
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

    // 1. Write the file to disk
    createFileWithRetries(task.filePath, task.fileContents);

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
          task.filePath,
          validationResult.error ?? '',
          task.dependenciesPath,
        );
      } catch (error) {
        this.logger.error(
          'Fix File Generic failed, get error: ' + error.messages,
        );
      }

      // Now we loop back, re-run the build to see if it's fixed.
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
    filePath: string,
    rawErrorText: string,
    dependenciesPath: string,
  ) {
    this.logger.log(`Generic fix attempt for file: ${filePath}`);
    const originalContent = readFileSync(filePath, 'utf-8');

    // const fixPrompt = generateFixPrompt(
    //   filePath,
    //   rawErrorText,
    //   dependenciesPath,
    //   originalContent,
    // );

    const fixPrompt = generateFileOperationPrompt(filePath, dependenciesPath);

    const frontendPath = this.context.getGlobalContext('frontendPath');
    const fileOperationManager = new FileOperationManager(frontendPath);
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
        ],
      },
      'fix code (generic)',
      'FrontendQueueProcessor',
    );

    this.logger.log('Fix Response: ' + fixResponse);
    const parsed_fixResponse = removeCodeBlockFences(fixResponse);

    // const { operations, generatedCode } = parser.parse(fixResponse);

    // await fileOperationManager.executeOperations(operations);

    // this.logger.debug('Fix result' + fixResponse);
    // remeber to do a retry here
    // const updatedCode = removeCodeBlockFences(fixResponse);

    // writeFileSync(filePath, updatedCode, 'utf-8');
    this.logger.log(`Generic fix applied to file: ${filePath}`);
  }
}
