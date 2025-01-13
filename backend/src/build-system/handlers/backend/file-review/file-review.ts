import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

import { prompts } from './prompt';
import { formatResponse } from 'src/build-system/utils/strings';
import {
  FileNotFoundError,
  FileModificationError,
  ResponseParsingError,
  ModelTimeoutError,
  TemporaryServiceUnavailableError,
  RateLimitExceededError,
} from 'src/build-system/errors';

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

    const backendPath = context.getGlobalContext('backendPath') || './backend';
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';
    const description =
      context.getGlobalContext('description') || 'Default Project Description';
    const projectOverview = `
        project name: ${projectName}
        project description: ${description},
      `;

    const backendRequirement = context.getNodeData('op:BACKEND:REQ')?.overview;
    const backendCode = [context.getNodeData('op:BACKEND:CODE')];

    if (!backendRequirement) {
      throw new FileNotFoundError('Backend requirements are missing.');
    }

    let files: string[];
    try {
      this.logger.log(`Scanning backend directory: ${backendPath}`);
      files = await fs.readdir(backendPath);
      if (!files.length) {
        throw new FileNotFoundError('No files found in the backend directory.');
      }
      this.logger.debug(`Found files: ${files.join(', ')}`);
    } catch (error) {
      this.handleFileSystemError(error);
    }

    const filePrompt = prompts.identifyBackendFilesToModify(
      files,
      backendRequirement,
      projectOverview,
      backendCode,
    );

    let modelResponse: string;
    try {
      modelResponse = await context.model.chatSync({
        model: 'gpt-4o-mini',
        messages: [{ content: filePrompt, role: 'system' }],
      });
    } catch (error) {
      this.handleModelError(error);
    }

    const filesToModify = this.parseFileIdentificationResponse(modelResponse);
    if (!filesToModify.length) {
      throw new FileModificationError('No files identified for modification.');
    }
    this.logger.log(`Files to modify: ${filesToModify.join(', ')}`);

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
          throw new FileModificationError(
            `Failed to generate content for file: ${fileName}.`,
          );
        }

        await fs.writeFile(filePath, newContent, 'utf-8');
        this.logger.log(`Successfully modified ${fileName}`);
      } catch (error) {
        this.handleFileProcessingError(fileName, error);
      }
    }

    return {
      success: true,
      data: `Modified files: ${filesToModify.join(', ')}`,
    };
  }

  /**
   * Parses the file identification response from the model.
   */
  parseFileIdentificationResponse(response: string): string[] {
    try {
      const parsedResponse = JSON.parse(formatResponse(response));
      if (!Array.isArray(parsedResponse)) {
        throw new ResponseParsingError(
          'File identification response is not an array.',
        );
      }
      this.logger.log('Parsed file identification response:', parsedResponse);
      return parsedResponse;
    } catch (error) {
      this.logger.error('Error parsing file identification response:', error);
      throw new ResponseParsingError(
        'Failed to parse file identification response.',
      );
    }
  }

  /**
   * Handles file system errors.
   */
  private handleFileSystemError(error: any): never {
    this.logger.error('File system error encountered:', error);
    throw new FileNotFoundError(
      `File system operation failed: ${error.message}`,
    );
  }

  /**
   * Handles model-related errors.
   */
  private handleModelError(error: any): never {
    if (
      error instanceof ModelTimeoutError ||
      error instanceof TemporaryServiceUnavailableError ||
      error instanceof RateLimitExceededError
    ) {
      this.logger.warn(`Retryable model error: ${error.message}`);
      throw error;
    }
    this.logger.error('Non-retryable model error encountered:', error);
    throw new ResponseParsingError(`Model error: ${error.message}`);
  }

  /**
   * Handles errors during file processing.
   */
  private handleFileProcessingError(fileName: string, error: any): never {
    if (
      error instanceof ModelTimeoutError ||
      error instanceof TemporaryServiceUnavailableError ||
      error instanceof RateLimitExceededError
    ) {
      this.logger.warn(
        `Retryable error for file ${fileName}: ${error.message}`,
      );
      throw error;
    }
    this.logger.error(`Non-retryable error for file ${fileName}:`, error);
    throw new FileModificationError(
      `Error processing file ${fileName}: ${error.message}`,
    );
  }
}
