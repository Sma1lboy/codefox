import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { generateBackendCodePrompt } from './prompt';
import { Logger } from '@nestjs/common';
import { saveGeneratedCode } from 'src/build-system/utils/files';
import * as path from 'path';
import {
  formatResponse,
} from 'src/build-system/utils/strings';
import { NonRetryableError, RetryableError } from 'src/build-system/retry-handler';
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

    if (!sitemapDoc || !datamapDoc || !databaseSchemas) {
      return {
        success: false,
        error: new NonRetryableError(
          'Missing required parameters: sitemapDoc, datamapDoc, or databaseSchemas.',
        ),
      };
    }

    const backendRequirementDoc =
      context.getNodeData('op:BACKEND:REQ')?.overview || '';
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

    try {
      // Invoke the language model to generate the backend code
      const modelResponse = await context.model.chatSync({
        model: 'gpt-4o-mini',
        messages: [{ content: backendCodePrompt, role: 'system' }],
      });

      const generatedCode = formatResponse(modelResponse);

      if (!generatedCode) {
        throw new RetryableError('Generated code is empty.');
      }

      const uuid = context.getGlobalContext('projectUUID');
      saveGeneratedCode(path.join(uuid, 'backend', currentFile), generatedCode);

      this.logger.debug('Backend code generated and parsed successfully.');

      // TODO: return backend API as output
      return {
        success: true,
        data: generatedCode,
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
        error: new NonRetryableError('Failed to generate backend code.'),
      };
    }
  }
}
