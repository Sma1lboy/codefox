import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

import { prompts } from './prompt';
import { formatResponse } from 'src/build-system/utils/strings';
import {
  NonRetryableError,
  RetryableError,
} from 'src/build-system/retry-handler';

/**
 * Responsible for reviewing all related source root files and considering modifications
 * such as package.json, tsconfig.json, .env, etc., in JS/TS projects.
 * @requires [op:BACKEND:REQ] - BackendRequirementHandler
 */
export class BackendFileReviewHandler implements BuildHandler<string> {
  readonly id = 'op:BACKEND:FILE:REVIEW';
  readonly logger: Logger = new Logger('BackendFileModificationHandler');

  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.logger.log('Starting backend file modification process...');

    try {
      const backendPath =
        context.getGlobalContext('backendPath') || './backend';
      const projectName =
        context.getGlobalContext('projectName') || 'Default Project Name';
      const description =
        context.getGlobalContext('description') ||
        'Default Project Description';
      const projectOverview = `
        project name: ${projectName}
        project description: ${description},
      `;

      const backendRequirement = context.getNodeData('op:BACKEND:REQ').overview;
      const backendCode = [context.getNodeData('op:BACKEND:CODE')];

      // 1. Identify files to modify
      this.logger.log(`Scanning backend directory: ${backendPath}`);
      const files = await fs.readdir(backendPath);
      if (!files.length) {
        throw new NonRetryableError('No files found in the backend directory.');
      }
      this.logger.debug(`Found files: ${files.join(', ')}`);

      const filePrompt = prompts.identifyBackendFilesToModify(
        files,
        backendRequirement,
        projectOverview,
        backendCode,
      );

      const modelResponse = await context.model.chatSync({
        model: 'gpt-4o-mini',
        messages: [{ content: filePrompt, role: 'system' }],
      });

      const filesToModify = this.parseFileIdentificationResponse(modelResponse);
      if (!filesToModify.length) {
        throw new RetryableError('No files identified for modification.');
      }
      this.logger.log(`Files to modify: ${filesToModify.join(', ')}`);

      // 2. Modify each identified file
      for (const fileName of filesToModify) {
        const filePath = path.join(backendPath, fileName);
        try {
          const currentContent = await fs.readFile(filePath, 'utf-8');

          const modificationPrompt = prompts.generateFileModificationPrompt(
            fileName,
            currentContent,
            backendRequirement,
            projectOverview,
            backendCode,
          );

          const response = await context.model.chatSync({
            model: 'gpt-4o-mini',
            messages: [{ content: modificationPrompt, role: 'system' }],
          });

          const newContent = formatResponse(response);
          if (!newContent) {
            throw new RetryableError(
              `Failed to generate content for file: ${fileName}.`,
            );
          }

          await fs.writeFile(filePath, newContent, 'utf-8');
          this.logger.log(`Successfully modified ${fileName}`);
        } catch (error) {
          if (error instanceof RetryableError) {
            this.logger.warn(
              `Retryable error for file ${fileName}: ${error.message}`,
            );
          } else {
            this.logger.error(
              `Non-retryable error for file ${fileName}:`,
              error,
            );
            throw error;
          }
        }
      }

      return {
        success: true,
        data: `Modified files: ${filesToModify.join(', ')}`,
      };
    } catch (error) {
      if (error instanceof RetryableError) {
        this.logger.warn(`Retryable error encountered: ${error.message}`);
        return {
          success: false,
          error,
        };
      }

      this.logger.error('Non-retryable error encountered:', error);
      return {
        success: false,
        error: new NonRetryableError('Failed to modify backend files.'),
      };
    }
  }

  parseFileIdentificationResponse(response: string): string[] {
    try {
      const parsedResponse = JSON.parse(formatResponse(response));
      if (!Array.isArray(parsedResponse)) {
        throw new NonRetryableError(
          'File identification response is not an array.',
        );
      }
      this.logger.log('Parsed file identification response:', parsedResponse);
      return parsedResponse;
    } catch (error) {
      this.logger.error('Error parsing file identification response:', error);
      throw new NonRetryableError(
        'Failed to parse file identification response.',
      );
    }
  }
}
