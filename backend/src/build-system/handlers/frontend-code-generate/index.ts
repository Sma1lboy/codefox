// frontend-code.handler.ts
import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { Logger } from '@nestjs/common';

// Utility functions (similar to your parseGenerateTag, removeCodeBlockFences)
import {
  parseGenerateTag,
  removeCodeBlockFences,
} from 'src/build-system/utils/database-utils';

// The function from step #1
import { generateFrontEndCodePrompt } from './prompt';

/**
 * FrontendCodeHandler is responsible for generating the frontend codebase
 * based on the provided sitemap, data mapping documents, backend requirement documents,
 * frontendDependencyFile, frontendDependenciesContext, .
 */
export class FrontendCodeHandler implements BuildHandler<string> {
  readonly id = 'op:FRONTEND:CODE';
  readonly logger: Logger = new Logger('FrontendCodeHandler');

  /**
   * Executes the handler to generate frontend code.
   * @param context - The builder context containing configuration and utilities.
   * @param args - The variadic arguments required for generating the frontend code.
   * @returns A BuildResult containing the generated code and related data.
   */
  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.logger.log('Generating Frontend Code...');

    // 1. Retrieve the necessary input from context
    const sitemapDoc = context.getNodeData('op:UX:SMD');
    const uxDataMapDoc = context.getNodeData('op:UX:DATAMAP:DOC');
    const backendRequirementDoc = context.getNodeData('op:BACKEND:REQ');

    // 2. Grab any globally stored context as needed
    const currentFilePath =
      context.getGlobalContext('currentFrontendFile') ||
      'src/pages/Home/index.tsx';
    const dependencyFilePath =
      context.getGlobalContext('frontendDependencyFile') || 'dependencies.json';
    const dependenciesContext =
      context.getGlobalContext('frontendDependenciesContext') || '';

    // 3. Generate the prompt
    const frontendCodePrompt = generateFrontEndCodePrompt(
      sitemapDoc,
      uxDataMapDoc,
      backendRequirementDoc.overview,
      currentFilePath,
      dependencyFilePath,
      dependenciesContext,
    );

    this.logger.debug('Generated frontend code prompt.');

    try {
      // 4. Call the model
      const modelResponse = await context.model.chatSync(
        {
          content: frontendCodePrompt,
        },
        'gpt-4o-mini', // or whichever model you need
      );

      // 5. Parse the output
      const generatedCode = removeCodeBlockFences(
        parseGenerateTag(modelResponse),
      );

      this.logger.debug('Frontend code generated and parsed successfully.');

      // 6. Return success
      return {
        success: true,
        data: generatedCode,
      };
    } catch (error) {
      // 7. Return error
      this.logger.error('Error during frontend code generation:', error);
      return {
        success: false,
        error: new Error('Failed to generate frontend code.'),
      };
    }
  }
}
