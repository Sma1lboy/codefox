import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { generateBackendCodePrompt } from './prompt';
import { Logger } from '@nestjs/common';
import {
  parseGenerateTag,
  removeCodeBlockFences,
} from 'src/build-system/utils/database-utils';
import { saveGeneratedCode } from 'src/build-system/utils/files';
import * as path from 'path';

/**
 * BackendCodeHandler is responsible for generating the backend codebase
 * based on the provided sitemap and data mapping documents.
 */
export class BackendCodeHandler implements BuildHandler<string> {
  readonly id = 'op:BACKEND:CODE';
  readonly logger: Logger = new Logger('BackendCodeHandler');

  /**
   * Executes the handler to generate backend code.
   * @param context - The builder context containing configuration and utilities.
   * @param args - The variadic arguments required for generating the backend code.
   * @returns A BuildResult containing the generated code and related data.
   */
  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.logger.log('Generating Backend Codebase...');

    // Retrieve project name and database type from context
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';
    const databaseType =
      context.getGlobalContext('databaseType') || 'Default database type';

    // Destructure arguments with default values for optional parameters
    const sitemapDoc = context.getNodeData('op:UX:SMD');
    const datamapDoc = context.getNodeData('op:UX:DATAMAP:DOC');
    const databaseSchemas = context.getNodeData('op:DATABASE:SCHEMAS');
    //TODO: make this backend generate similar as FileGenerateHandler, do file arch, and then generate each backend code
    //TODO: backend requirement
    const backendRequirementDoc =
      context.getNodeData('op:BACKEND:REQ').overview;

    const currentFile = 'index.js';
    const dependencyFile = 'dependencies.json';

    // Generate the prompt using the provided documents and project name
    const backendCodePrompt = generateBackendCodePrompt(
      projectName,
      sitemapDoc,
      datamapDoc,
      backendRequirementDoc,
      databaseType,
      databaseSchemas,
      currentFile,
      'javascript',
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

      const uuid = context.getGlobalContext('projectUUID');
      saveGeneratedCode(path.join(uuid, 'backend', currentFile), generatedCode);

      this.logger.debug('Backend code generated and parsed successfully.');

      // TODO: return backend api as output
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
