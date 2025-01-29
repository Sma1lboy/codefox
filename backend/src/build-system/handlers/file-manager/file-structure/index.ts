import { BuildHandler, BuildOpts, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';
import {
  parseGenerateTag,
  removeCodeBlockFences,
} from 'src/build-system/utils/strings';
import { chatSyncWithClocker } from 'src/build-system/utils/handler-helper';
import {
  ResponseParsingError,
  MissingConfigurationError,
} from 'src/build-system/errors';
import { UXSMDHandler } from '../../ux/sitemap-document';
import { UXDMDHandler } from '../../ux/datamap';
import { BuildNode, BuildNodeRequire } from 'src/build-system/hanlder-manager';

/**
 * FileStructureHandler is responsible for generating the project's file and folder structure
 * based on the provided documentation.
 */
@BuildNode()
@BuildNodeRequire([UXSMDHandler, UXDMDHandler])
export class FileStructureHandler implements BuildHandler<string> {
  readonly id = 'op:FILE:STRUCT';
  private readonly logger: Logger = new Logger('FileStructureHandler');

  async run(
    context: BuilderContext,
    opts?: BuildOpts,
  ): Promise<BuildResult<string>> {
    this.logger.log('Generating File Structure Document...');

    // Retrieve projectName from context
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';
    const sitemapDoc = context.getNodeData(UXSMDHandler);
    const datamapDoc = context.getNodeData(UXDMDHandler);
    // const projectPart = opts?.projectPart ?? 'frontend';
    const projectPart = 'frontend';
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

    const convertToJsonPrompt = prompts.convertTreeToJsonPrompt();

    const messages = [
      {
        role: 'system' as const,
        content: prompt,
      },
      {
        role: 'user' as const,
        content: `
          **Sitemap Documentation**
          ${sitemapDoc}
          `,
      },
      {
        role: 'user' as const,
        content: `
          **Data map Analysis Documentation:**:
          ${datamapDoc}

          Now please generate tree folder structure.
         `,
      },
      {
        role: 'system' as const,
        content: convertToJsonPrompt,
      },
      {
        role: 'user' as const,
        content: `**Final Check:**
      **Final Check**
        Before returning the output, ensure the following:
      - The JSON structure is correctly formatted and wrapped in <GENERATE></GENERATE> tags.
      - File extensions and paths match those in the Directory Structure.
      - All files and dependencies are included, with relative paths used wherever possible.`,
      },
    ];

    let fileStructureContent: string;
    try {
      fileStructureContent = await chatSyncWithClocker(
        context,
        {
          model: 'gpt-4o-mini',
          messages,
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

    this.logger.log('start parse');
    // Build the virtual directory
    let fileStructureJsonContent = '';
    try {
      fileStructureJsonContent = parseGenerateTag(fileStructureContent);
    } catch (error) {
      return {
        success: false,
        error: new ResponseParsingError(
          'Failed to parse file Structure Json Content.',
        ),
      };
    }
    this.logger.log('parse success: ' + fileStructureJsonContent);

    this.logger.log('start building');
    try {
      const successBuild = context.buildVirtualDirectory(
        fileStructureJsonContent,
      );
      if (!successBuild) {
        this.logger.error(
          'Failed to build virtual directory.' + fileStructureJsonContent,
        );
        throw new ResponseParsingError('Failed to build virtual directory.');
      } else {
        this.logger.log('build success');
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
      `File structure JSON content and virtual directory built successfully.
    ${removeCodeBlockFences(fileStructureJsonContent)}`,
    );

    context.virtualDirectory.getAllFiles().forEach((file) => {
      this.logger.log(file);
    });
    return {
      success: true,
      data: removeCodeBlockFences(fileStructureContent),
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
