import { Logger } from '@nestjs/common';
import { FrontendCodeValidator } from './FrontendCodeValidator';
import { CodeTaskQueue, FileTask } from './CodeTaskQueue';
import { readFileSync, writeFileSync } from 'fs';
import { chatSyncWithClocker } from 'src/build-system/utils/handler-helper';
import { createFileWithRetries } from 'src/build-system/utils/files';
import { BuilderContext } from 'src/build-system/context';

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

      await this.processSingleTask(task);

      this.logger.log(`Remaining tasks in queue: ${this.queue.size}`);
    }

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
      await this.fixFileGeneric(task.filePath, validationResult.error ?? '');

      // Now we loop back, re-run the build to see if it's fixed.
    }

    // If we reached here, we failed all attempts
    // throw new Error(
    //   `Failed to fix build for file ${task.filePath} after ${maxFixAttempts} attempts.`,
    // );

    // if we dont want to end the process
    this.logger.error(
      `Failed to fix build for file ${task.filePath} after ${maxFixAttempts} attempts.`,
    );
  }

  /**
   * Attempt to fix a known file error using an LLM prompt that includes:
   * - The existing code
   * - The compiler error info
   */
  private async fixFileError(filePath: string, errDetail: any) {
    this.logger.log(`Fixing error in file: ${filePath}`);
    const originalContent = readFileSync(filePath, 'utf-8');

    // Construct your "fix" prompt
    const fixPrompt = `
There's a TypeScript error in file: ${filePath}
Line: ${errDetail.line}, Column: ${errDetail.column}
Error code: ${errDetail.tsCode}
Message: ${errDetail.message}

Current file content:
\`\`\`
${originalContent}
\`\`\`

Please fix the code so that this error is resolved. Return only the updated code wrapped in <GENERATE> tags.
`;

    // Use your chat function to get a fix
    const fixResponse = await chatSyncWithClocker(
      /* context= */ null, // or pass your real context
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You fix TypeScript code errors.' },
          { role: 'user', content: fixPrompt },
        ],
      },
      'fix code',
      'FrontendQueueProcessor',
    );

    // Extract the <GENERATE> code
    const updatedCode = this.extractGenerateContent(fixResponse);

    // Overwrite file
    writeFileSync(filePath, updatedCode, 'utf-8');
    this.logger.log(`File ${filePath} has been updated to address the error.`);
  }

  /**
   * Fallback if you have no structured error details.
   */
  private async fixFileGeneric(filePath: string, rawErrorText: string) {
    this.logger.log(`Generic fix attempt for file: ${filePath}`);
    const originalContent = readFileSync(filePath, 'utf-8');

    const fixPrompt = `
We have a TypeScript build failure. The raw error text is:
\`\`\`
${rawErrorText}
\`\`\`

The file content is:
\`\`\`
${originalContent}
\`\`\`

Please fix the code so it compiles successfully. Return only the updated code wrapped in <GENERATE> tags.
`;

    // Use your model for a fix
    const fixResponse = await chatSyncWithClocker(
      /* context= */ this.context,
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You fix TypeScript code errors.' },
          { role: 'user', content: fixPrompt },
        ],
      },
      'fix code (generic)',
      'FrontendQueueProcessor',
    );

    this.logger.debug('Fix result' + fixResponse);
    const updatedCode = this.extractGenerateContent(fixResponse);
    writeFileSync(filePath, updatedCode, 'utf-8');
    this.logger.log(`Generic fix applied to file: ${filePath}`);
  }

  /**
   * Example helper to parse out <GENERATE> ... </GENERATE>.
   * Or you might have your existing formatResponse() logic.
   */
  private extractGenerateContent(modelResponse: string): string {
    // For example, a regex or a simple parse:
    const regex = /<GENERATE>([\s\S]*?)<\/GENERATE>/;
    const match = modelResponse.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
    // If not found, fallback to the entire response
    return modelResponse;
  }
}
