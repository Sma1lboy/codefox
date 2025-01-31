import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { generateBackendCodePrompt } from './prompt';
import { saveGeneratedCode } from 'src/build-system/utils/files';
import * as path from 'path';
import { formatResponse } from 'src/build-system/utils/strings';
import { chatSyncWithClocker } from 'src/build-system/utils/handler-helper';
import {
  FileWriteError,
  InvalidParameterError,
  MissingConfigurationError,
  ResponseParsingError,
} from 'src/build-system/errors';
import { BuildNode, BuildNodeRequire } from 'src/build-system/hanlder-manager';
import { UXSMDHandler } from '../../ux/sitemap-document';
import { UXDMDHandler } from '../../ux/datamap';
import { DBSchemaHandler } from '../../database/schemas/schemas';
import { BackendRequirementHandler } from '../requirements-document';

/**
 * BackendCodeHandler is responsible for generating the backend codebase
 * based on the provided sitemap and data mapping documents.
 */

@BuildNode()
@BuildNodeRequire([
  UXSMDHandler,
  UXDMDHandler,
  DBSchemaHandler,
  BackendRequirementHandler,
])
export class BackendCodeHandler implements BuildHandler<string> {
  async run(context: BuilderContext): Promise<BuildResult<string>> {
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';
    const databaseType =
      context.getGlobalContext('databaseType') || 'Default database type';
    // Retrieve required documents
    const sitemapDoc = context.getNodeData(UXSMDHandler);
    const datamapDoc = context.getNodeData(UXDMDHandler);
    const databaseSchemas = context.getNodeData(DBSchemaHandler);
    const backendRequirementDoc =
      context.getNodeData(BackendRequirementHandler)?.overview || '';

    // Validate required data
    if (!sitemapDoc || !datamapDoc || !databaseSchemas) {
      throw new MissingConfigurationError(
        `Missing required configuration: sitemapDoc, datamapDoc, or databaseSchemas: siteMapDoc: ${!!sitemapDoc}, datamapDoc: ${!!datamapDoc}, databaseSchemas: ${!!databaseSchemas}`,
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
      'javascript', // TODO: make sure this lang come from the context
      dependencyFile,
    );

    let generatedCode: string;
    try {
      const modelResponse = await chatSyncWithClocker(
        context,
        {
          model: 'gpt-4o-mini',
          messages: [{ content: backendCodePrompt, role: 'system' }],
        },
        'generateBackendCode',
        BackendCodeHandler.name,
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
