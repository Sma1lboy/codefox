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
import {
  RetryableError,
  NonRetryableError,
} from 'src/build-system/retry-handler';

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
    this.logger.debug(`Project Name: ${projectName}`);

    const sitemapDoc = context.getNodeData('op:UX:SMD');
    const datamapDoc = context.getNodeData('op:UX:DATAMAP:DOC');
    const projectPart = opts?.projectPart ?? 'frontend';
    const framework = context.getGlobalContext('framework') ?? 'react';

    // Validate required arguments
    if (!sitemapDoc || typeof sitemapDoc !== 'string') {
      return {
        success: false,
        error: new NonRetryableError('Missing or invalid sitemapDoc.'),
      };
    }
    if (!datamapDoc || typeof datamapDoc !== 'string') {
      return {
        success: false,
        error: new NonRetryableError('Missing or invalid datamapDoc.'),
      };
    }
    if (!framework || typeof framework !== 'string') {
      return {
        success: false,
        error: new NonRetryableError('Missing or invalid framework.'),
      };
    }
    if (
      !projectPart ||
      (projectPart !== 'frontend' && projectPart !== 'backend')
    ) {
      return {
        success: false,
        error: new NonRetryableError(
          'Invalid projectPart. Must be either "frontend" or "backend".',
        ),
      };
    }

    this.logger.debug(`Project Part: ${projectPart}`);
    this.logger.debug(
      'Sitemap Documentation and Data Analysis Document are provided.',
    );

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
      fileStructureContent = await context.model.chatSync({
        model: 'gpt-4o-mini',
        messages: [{ content: prompt, role: 'system' }],
      });

      if (!fileStructureContent || fileStructureContent.trim() === '') {
        throw new RetryableError('Generated file structure content is empty.');
      }
    } catch (error) {
      if (error instanceof RetryableError) {
        this.logger.warn(
          `Retryable error during file structure generation: ${error.message}`,
        );
        return { success: false, error };
      }

      this.logger.error(
        'Non-retryable error during file structure generation:',
        error,
      );
      return {
        success: false,
        error: new NonRetryableError('Failed to generate file structure.'),
      };
    }

    this.logger.debug('Generated file structure content.');

    // Convert the tree structure to JSON using the appropriate prompt
    const convertToJsonPrompt =
      prompts.convertTreeToJsonPrompt(fileStructureContent);

    let fileStructureJsonContent: string;
    try {
      fileStructureJsonContent = await context.model.chatSync({
        model: 'gpt-4o-mini',
        messages: [{ content: convertToJsonPrompt, role: 'system' }],
      });

      if (!fileStructureJsonContent || fileStructureJsonContent.trim() === '') {
        throw new RetryableError('Failed to convert file structure to JSON.');
      }
    } catch (error) {
      if (error instanceof RetryableError) {
        this.logger.warn(
          `Retryable error during tree-to-JSON conversion: ${error.message}`,
        );
        return { success: false, error };
      }

      this.logger.error(
        'Non-retryable error during tree-to-JSON conversion:',
        error,
      );
      return {
        success: false,
        error: new NonRetryableError(
          'Failed to convert file structure to JSON.',
        ),
      };
    }

    this.logger.debug('Converted file structure to JSON.');

    // Build the virtual directory
    try {
      const successBuild = context.buildVirtualDirectory(
        fileStructureJsonContent,
      );
      if (!successBuild) {
        throw new RetryableError('Failed to build virtual directory.');
      }
    } catch (error) {
      if (error instanceof RetryableError) {
        this.logger.warn(
          `Retryable error during virtual directory build: ${error.message}`,
        );
        return { success: false, error };
      }

      this.logger.error(
        'Non-retryable error during virtual directory build:',
        error,
      );
      return {
        success: false,
        error: new NonRetryableError('Failed to build virtual directory.'),
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
}
