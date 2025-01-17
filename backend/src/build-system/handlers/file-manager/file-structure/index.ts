import {
  BuildHandler,
  BuildOpts,
  BuildResult,
  FileStructOutput,
} from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import { chatSyncWithClocker } from 'src/build-system/utils/handler-helper';
import {
  ResponseParsingError,
  MissingConfigurationError,
} from 'src/build-system/errors';

/**
 * FileStructureHandler is responsible for generating the project's file and folder structure
 * based on the provided documentation.
 */
export class FileStructureHandler implements BuildHandler<FileStructOutput> {
  readonly id = 'op:FILE:STRUCT';
  private readonly logger: Logger = new Logger('FileStructureHandler');

  async run(
    context: BuilderContext,
    opts?: BuildOpts,
  ): Promise<BuildResult<FileStructOutput>> {
    this.logger.log('Generating File Structure Document...');

    // Retrieve projectName from context
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';
    const sitemapDoc = context.getNodeData('op:UX:SMD');
    const datamapDoc = context.getNodeData('op:UX:DATAMAP:DOC');
    const projectPart = opts?.projectPart ?? 'frontend';
    const framework = context.getGlobalContext('framework') ?? 'react';

    // Validate required arguments
    this.validateInputs(sitemapDoc, datamapDoc, framework, projectPart);

    // Generate the common file structure prompt
    const prompt = prompts.generateCommonFileStructurePrompt(
      projectName,
      sitemapDoc,
      datamapDoc,
      framework,
      projectPart,
    );

    let fileStructureContent: string;
    try {
      fileStructureContent = await chatSyncWithClocker(
        context,
        {
          model: 'gpt-4o-mini',
          messages: [{ content: prompt, role: 'system' }],
        },
        'generateCommonFileStructure',
        this.id,
      );

      if (!fileStructureContent || fileStructureContent.trim() === '') {
        throw new ResponseParsingError(
          `Generated content is empty during op:FILE:STRUCT.`,
        );
      }
    } catch (error) {
      return { success: false, error };
    }

    // Convert the tree structure to JSON
    const convertToJsonPrompt =
      prompts.convertTreeToJsonPrompt(fileStructureContent);

    let fileStructureJsonContent: string;
    try {
      fileStructureJsonContent = await chatSyncWithClocker(
        context,
        {
          model: 'gpt-4o-mini',
          messages: [{ content: convertToJsonPrompt, role: 'system' }],
        },
        'convertToJsonPrompt',
        this.id,
      );

      if (!fileStructureJsonContent || fileStructureJsonContent.trim() === '') {
        throw new ResponseParsingError(
          `Generated content is empty during op:FILE:STRUCT 2.`,
        );
      }
    } catch (error) {
      return { success: false, error };
    }

    // Build the virtual directory
    try {
      const successBuild = context.buildVirtualDirectory(
        fileStructureJsonContent,
      );
      if (!successBuild) {
        throw new ResponseParsingError('Failed to build virtual directory.');
      }
    } catch (error) {
      this.logger.error(
        'Non-retryable error during virtual directory build:',
        error,
      );
      return {
        success: false,
        error: new ResponseParsingError('Failed to build virtual directory.'),
      };
    }

    this.logger.log(
      'File structure JSON content and virtual directory built successfully.',
    );

    return {
      success: true,
      data: {
        fileStructure: removeCodeBlockFences(fileStructureContent),
        jsonFileStructure: removeCodeBlockFences(fileStructureJsonContent),
      },
    };
  }

  private validateInputs(
    sitemapDoc: any,
    datamapDoc: any,
    framework: string,
    projectPart: string,
  ): void {
    if (!sitemapDoc || typeof sitemapDoc !== 'string') {
      throw new MissingConfigurationError('Missing or invalid sitemapDoc.');
    }
    if (!datamapDoc || typeof datamapDoc !== 'string') {
      throw new MissingConfigurationError('Missing or invalid datamapDoc.');
    }
    if (!framework || typeof framework !== 'string') {
      throw new MissingConfigurationError('Missing or invalid framework.');
    }
    if (!['frontend', 'backend'].includes(projectPart)) {
      throw new MissingConfigurationError(
        'Invalid projectPart. Must be either "frontend" or "backend".',
      );
    }
  }
}
