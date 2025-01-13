import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { generateBackendCodePrompt } from './prompt';
import { saveGeneratedCode } from 'src/build-system/utils/files';
import * as path from 'path';
import { formatResponse } from 'src/build-system/utils/strings';
import {
  MissingConfigurationError,
  InvalidParameterError,
  FileWriteError,
  ParsingError,
  ResponseTagError,
} from 'src/build-system/errors';

/**
 * BackendCodeHandler is responsible for generating the backend codebase
 * based on the provided sitemap and data mapping documents.
 */
export class BackendCodeHandler implements BuildHandler<string> {
  readonly id = 'op:BACKEND:CODE';

  /**
   * Executes the handler to generate backend code.
   * @param context - The builder context containing configuration and utilities.
   * @returns A BuildResult containing the generated code and related data.
   */
  async run(context: BuilderContext): Promise<BuildResult<string>> {
    // Retrieve project name and database type from context
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';
    const databaseType =
      context.getGlobalContext('databaseType') || 'Default database type';

    // Retrieve required documents
    const sitemapDoc = context.getNodeData('op:UX:SMD');
    const datamapDoc = context.getNodeData('op:UX:DATAMAP:DOC');
    const databaseSchemas = context.getNodeData('op:DATABASE:SCHEMAS');
    const backendRequirementDoc =
      context.getNodeData('op:BACKEND:REQ')?.overview || '';

    // Validate required data
    if (!sitemapDoc || !datamapDoc || !databaseSchemas) {
      throw new MissingConfigurationError(
        'Missing required configuration: sitemapDoc, datamapDoc, or databaseSchemas.',
      );
    }

    if (typeof databaseSchemas !== 'object') {
      throw new InvalidParameterError(
        'databaseSchemas should be a valid object.',
      );
    }

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

      let modelResponse;
    try {
      modelResponse = await context.model.chatSync({
        model: 'gpt-4o-mini',
        messages: [{ content: backendCodePrompt, role: 'system' }],
      });
    } catch (error) {
        throw error;
    }

    let generatedCode: string;
    try {
      generatedCode = formatResponse(modelResponse);
      if (!generatedCode) {
        throw new ResponseTagError('Response tag extraction failed.');
      }
    } catch (error) {
      if (error instanceof ResponseTagError) {
        throw error;
      }
      throw new ParsingError(
        'Error occurred while parsing the model response.',
      );
    }

    // Save the generated code to the specified location
    const uuid = context.getGlobalContext('projectUUID');
    const savePath = path.join(uuid, 'backend', currentFile);

    try {
      saveGeneratedCode(savePath, generatedCode);
    } catch (error) {
      throw new FileWriteError(
        `Failed to save backend code to ${savePath}: ${error.message}`,
      );
    }

    return {
      success: true,
      data: generatedCode,
    };
  }

}
