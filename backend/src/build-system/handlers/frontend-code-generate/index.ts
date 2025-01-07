// frontend-code.handler.ts
import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { Logger } from '@nestjs/common';
import {
  generateFilesDependency,
  createFile,
} from '../../utils/file_generator_util';
import { VirtualDirectory } from '../../virtual-dir';
import normalizePath from 'normalize-path';
import * as path from 'path';
import { readFile } from 'fs/promises';

// Utility functions (similar to your parseGenerateTag, removeCodeBlockFences)
import {
  parseGenerateTag,
  removeCodeBlockFences,
} from 'src/build-system/utils/database-utils';

// The function from step #1
import { generateFrontEndCodePrompt, generateCSSPrompt } from './prompt';

/**
 * FrontendCodeHandler is responsible for generating the frontend codebase
 * based on the provided sitemap, data mapping documents, backend requirement documents,
 * frontendDependencyFile, frontendDependenciesContext, .
 */
export class FrontendCodeHandler implements BuildHandler<string> {
  readonly id = 'op:FRONTEND:CODE';
  readonly logger: Logger = new Logger('FrontendCodeHandler');
  private virtualDir: VirtualDirectory;

  /**
   * Executes the handler to generate frontend code.
   * @param context - The builder context containing configuration and utilities.
   * @param args - The variadic arguments required for generating the frontend code.
   * @returns A BuildResult containing the generated code and related data.
   */
  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.logger.log('Generating Frontend Code...');

    // 1. Retrieve the necessary input from context
    const sitemapStruct = context.getNodeData('op:UX:SMS');
    const uxDataMapDoc = context.getNodeData('op:UX:DATAMAP:DOC');
    const backendRequirementDoc = context.getNodeData('op:BACKEND:REQ');
    const fileArchDoc = context.getNodeData('op:FILE:ARCH');

    // 2. Grab any globally stored context as needed
    this.virtualDir = context.virtualDirectory;
    const frontendPath = context.getGlobalContext('frontendPath');

    // Dependency
    const { sortedFiles, fileInfos } = await generateFilesDependency(
      fileArchDoc,
      this.virtualDir,
    );

    // Iterate the sortedFiles
    for (const file of sortedFiles) {
      const currentFullFilePath = normalizePath(
        path.resolve(frontendPath, 'src', file),
      );

      const extension = currentFullFilePath.split('.').pop() || '';

      // Retrieve the direct dependencies for this file
      const directDepsArray = fileInfos[file]?.dependsOn || [];

      //gather the contents of each dependency into a single string.
      let dependenciesContext = '';
      for (const dep of directDepsArray) {
        try {
          // Resolve against frontendPath to get the absolute path
          const resolvedDepPath = normalizePath(
            path.resolve(frontendPath, 'src', dep),
          );

          // Read the file. (may want to guard so only read certain file types.)
          const fileContent = await readFile(resolvedDepPath, 'utf-8');

          //just append a code:
          dependenciesContext += `\n\n[Dependency: ${dep}]\n\`\`\`\n${fileContent}\n\`\`\`\n`;
        } catch (readError) {
          // If the file doesn't exist or can't be read, log a warning.
          this.logger.warn(
            `Failed to read dependency "${dep}" for file "${file}": ${readError}`,
          );
        }
      }

      // Format for the prompt
      const directDependencies = directDepsArray.join('\n');

      this.logger.log(
        `Generating file in dependency order: ${currentFullFilePath}`,
      );
      this.logger.log(
        `2 Generating file in dependency order directDependencies: ${directDependencies}`,
      );

      let frontendCodePrompt = '';

      if (extension === 'css') {
        frontendCodePrompt = generateCSSPrompt(
          sitemapStruct,
          uxDataMapDoc,
          file,
          directDependencies,
          dependenciesContext,
        );
      } else {
        // Generate the prompt
        frontendCodePrompt = generateFrontEndCodePrompt(
          sitemapStruct,
          uxDataMapDoc,
          backendRequirementDoc.overview,
          file,
          directDependencies,
          dependenciesContext,
        );
      }
      this.logger.log(
        'generate code prompt for frontendCodePrompt or css: ' +
          frontendCodePrompt,
      );

      this.logger.debug('Generated frontend code prompt.');

      let generatedCode = '';
      try {
        // Call the model
        const modelResponse = await context.model.chatSync(
          {
            content: frontendCodePrompt,
          },
          'gpt-4o-mini', // or whichever model you need
        );

        // Parse the output
        generatedCode = parseGenerateTag(modelResponse);

        this.logger.debug('Frontend code generated and parsed successfully.');
      } catch (error) {
        // Return error
        this.logger.error('Error during frontend code generation:', error);
        return {
          success: false,
          error: new Error('Failed to generate frontend code.'),
        };
      }

      await createFile(currentFullFilePath, generatedCode);
    }

    return {
      success: true,
      data: 'test',
      error: new Error('Frontend code generated and parsed successfully.'),
    };
  }
}
