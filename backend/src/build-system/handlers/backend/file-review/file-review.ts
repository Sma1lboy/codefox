import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

import { prompts } from './prompt';
import { formatResponse } from 'src/build-system/utils/strings';
import { MessageInterface } from 'src/common/model-provider/types';
import { chatSyncWithClocker } from 'src/build-system/utils/handler-helper';
import {
  FileNotFoundError,
  FileModificationError,
  ResponseParsingError,
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
      throw error;
    }

    const filePrompt = prompts.identifyBackendFilesToModify(
      files,
      backendRequirement,
      projectOverview,
      backendCode,
    );

    let modelResponse: string;
    
    try {
      let messages: MessageInterface[] = [{content: filePrompt, role: 'system'}];
      modelResponse = await chatSyncWithClocker(context, messages, 'gpt-4o-mini', 'generateBackendCode', this.id);
    } catch (error) {
      throw error;
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

        let messages: MessageInterface[] = [{content: modificationPrompt, role: 'system'}];
        let response = await chatSyncWithClocker(context, messages, 'gpt-4o-mini', 'generateBackendFile', this.id);
        
        const newContent = formatResponse(response);
        if (!newContent) {
          throw new FileModificationError(
            `Failed to generate content for file: ${fileName}.`,
          );
        }

        await fs.writeFile(filePath, newContent, 'utf-8');
        this.logger.log(`Successfully modified ${fileName}`);
      } catch (error) {
        throw error;
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
}
