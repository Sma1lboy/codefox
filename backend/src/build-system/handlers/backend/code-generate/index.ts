import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { generateBackendCodePrompt } from './prompt';
import { saveGeneratedCode } from 'src/build-system/utils/files';
import * as path from 'path';
import { formatResponse } from 'src/build-system/utils/strings';
import { chatSyncWithClocker } from 'src/build-system/utils/handler-helper';
import { MessageInterface } from 'src/common/model-provider/types';
import {
  FileWriteError,
  InvalidParameterError,
  MissingConfigurationError,
  ResponseParsingError,
} from 'src/build-system/errors';
import { Logger } from '@nestjs/common';

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

    if (!databaseSchemas) {
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

    let generatedCode: string;
    try {
      // Invoke the language model to generate the backend code
      const messages: MessageInterface[] = [
        { content: backendCodePrompt, role: 'system' },
      ];
      const modelResponse = await chatSyncWithClocker(
        context,
        messages,
        'gpt-4o-mini',
        'generateBackendCode',
        this.id,
      );

      generatedCode = formatResponse(modelResponse);

      const uuid = context.getGlobalContext('projectUUID');
      saveGeneratedCode(path.join(uuid, 'backend', currentFile), generatedCode);
      generatedCode = formatResponse(modelResponse);
      if (!generatedCode) {
        throw new ResponseParsingError('Response tag extraction failed.');
      }
    } catch (error) {
      if (error instanceof ResponseParsingError) {
        throw error;
      }
      throw new ResponseParsingError(
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
