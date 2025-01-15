import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

import { prompts } from './prompt';
import { formatResponse } from 'src/build-system/utils/strings';
import { BuildMonitor } from 'src/build-system/monitor';
import { MessageInterface } from 'src/common/model-provider/types';
import { chatSyncWithClocker } from 'src/build-system/utils/handler-helper';

// TODO(Sma1lboy): we need a better way to handle handler pre requirements
/**
 *
 * Responsible for review all relate src root file and consider to modify them
 * such as package.json, tsconfig.json, .env, etc. in js/ts project
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
      const backendCode = [context.getNodeData('op:BACKEND:CODE')]; // Convert to array for now

      // 1. Identify files to modify
      this.logger.log(`Scanning backend directory: ${backendPath}`);
      const files = await fs.readdir(backendPath);
      this.logger.debug(`Found files: ${files.join(', ')}`);

      const filePrompt = prompts.identifyBackendFilesToModify(
        files,
        backendRequirement,
        projectOverview,
        backendCode,
      );

      let messages: MessageInterface[] = [{content: filePrompt, role: 'system'}];
      const modelResponse = await chatSyncWithClocker(context, messages, 'gpt-4o-mini', 'generateBackendCode', this.id);

      const filesToModify = this.parseFileIdentificationResponse(modelResponse);
      this.logger.log(`Files to modify: ${filesToModify.join(', ')}`);

      // 2. Modify each identified file
      for (const fileName of filesToModify) {
        const filePath = path.join(backendPath, fileName);
        try {
          // Read current content
          const currentContent = await fs.readFile(filePath, 'utf-8');

          // Generate modification prompt
          const modificationPrompt = prompts.generateFileModificationPrompt(
            fileName,
            currentContent,
            backendRequirement,
            projectOverview,
            backendCode,
          );

          const startTime = new Date();
          // Get modified content
          let messages: MessageInterface[] = [{content: modificationPrompt, role: 'system'}];
          const response = await chatSyncWithClocker(context, messages, 'gpt-4o-mini', 'generateFileModification', this.id);

          // Extract new content and write back
          const newContent = formatResponse(response);
          await fs.writeFile(filePath, newContent, 'utf-8');

          this.logger.log(`Successfully modified ${fileName}`);
        } catch (error) {
          this.logger.error(`Error modifying file ${fileName}:`, error);
          throw error;
        }
      }

      return {
        success: true,
        data: `Modified files: ${filesToModify.join(', ')}`,
      };
    } catch (error) {
      this.logger.error('Error during backend file modification:', error);
      return {
        success: false,
        error: new Error('Failed to modify backend files.'),
      };
    }
  }

  parseFileIdentificationResponse(response: string): string[] {
    const parsedResponse = JSON.parse(formatResponse(response));
    this.logger.log('Parsed file identification response:', parsedResponse);
    return parsedResponse;
  }
}
