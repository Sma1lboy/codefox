import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

import { prompts } from './prompt';
import { formatResponse } from 'src/build-system/utils/strings';
import { BuildMonitor } from 'src/build-system/monitor';

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
  
  private monitor = BuildMonitor.getInstance();

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

      
      let modelResponse = await BuildMonitor.timeRecorder(filePrompt, this.id, 'file struct');

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

         
          let response = await BuildMonitor.timeRecorder(modificationPrompt, this.id, 'modification');
          // Get modified content
          
          // Extract new content and write back
          const newContent = formatResponse(response);
          await fs.writeFile(filePath, newContent, 'utf-8');
          this.logger.debug(
            'modification code generated and parsed successfully.',
          );
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
