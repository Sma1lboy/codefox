import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { generateBackendCodePrompt } from './prompt';
import { Logger } from '@nestjs/common';
import {
  parseGenerateTag,
  removeCodeBlockFences,
} from 'src/build-system/utils/database-utils';

/**
 * Defines the expected order and types of arguments for BackendCodeHandler.
 *
 * @param sitemapDoc - The sitemap documentation as a string.
 * @param DatamapDoc - The data analysis document as a string.
 * @param currentFile - (Optional) The name of the current file. Defaults to 'backend.js'.
 * @param dependencyFile - (Optional) The name of the dependency file. Defaults to 'dependencies.json'.
 */
type BackendCodeArgs = [
  sitemapDoc: string,
  DatamapDoc: string,
  currentFile?: string,
  dependencyFile?: string,
];

/**
 * BackendCodeHandler is responsible for generating the backend codebase
 * based on the provided sitemap and data mapping documents.
 */
export class BackendCodeHandler implements BuildHandler {
  readonly id = 'op:BACKEND_CODE::STATE:GENERATE';
  readonly logger: Logger = new Logger('BackendCodeHandler');

  /**
   * Executes the handler to generate backend code.
   * @param context - The builder context containing configuration and utilities.
   * @param args - The variadic arguments required for generating the backend code.
   * @returns A BuildResult containing the generated code and related data.
   */
  async run(context: BuilderContext, ...args: any[]): Promise<BuildResult> {
    this.logger.log('Generating Backend Codebase...');

    // Retrieve projectName from context
    const projectName =
      context.getData('projectName') || 'Default Project Name';
    this.logger.debug(`Project Name: ${projectName}`);

    // Validate and extract args
    if (!args || !Array.isArray(args)) {
      throw new Error(
        'Backend code generation requires specific configuration arguments as an array.',
      );
    }

    // Destructure arguments with default values for optional parameters
    const [
      sitemapDoc,
      DatamapDoc,
      currentFile = 'backend.js',
      dependencyFile = 'dependencies.json',
    ] = args as BackendCodeArgs;

    this.logger.debug(
      'Sitemap Documentation and Data Analysis Document are provided.',
    );

    // Generate the prompt using the provided documents and project name
    const backendCodePrompt = generateBackendCodePrompt(
      projectName,
      sitemapDoc,
      DatamapDoc,
      currentFile,
      dependencyFile,
    );

    // Log the prompt generation
    this.logger.debug('Generated backend code prompt.');

    try {
      // Invoke the language model to generate the backend code
      const modelResponse = await context.model.chatSync(
        {
          content: backendCodePrompt,
        },
        'gpt-4o-mini', // Specify the model variant as needed
      );

      const generatedCode = removeCodeBlockFences(
        parseGenerateTag(modelResponse),
      );

      // Optionally, you can process or validate the generated code here
      this.logger.debug('Backend code generated and parsed successfully.');

      return {
        success: true,
        data: generatedCode,
      };
    } catch (error) {
      this.logger.error('Error during backend code generation:', error);
      return {
        success: false,
        error: new Error('Failed to generate backend code.'),
      };
    }
  }
}
