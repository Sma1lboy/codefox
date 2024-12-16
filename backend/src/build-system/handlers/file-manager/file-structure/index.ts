import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';

/**
 * Defines the expected order and types of arguments for FileStructureHandler.
 *
 * Expected argument order:
 * 0 - sitemapDoc: string
 * 1 - dataAnalysisDoc: string
 * 2 - framework: string
 * 3 - projectPart: 'frontend' | 'backend'
 */
type FileStructureArgs = [
  sitemapDoc: string,
  dataAnalysisDoc: string,
  framework: string,
  projectPart: 'frontend' | 'backend',
];

/**
 * FileStructureHandler is responsible for generating the project's file and folder structure
 * based on the provided documentation.
 */
export class FileStructureHandler implements BuildHandler {
  readonly id = 'op:FSTRUCT::STATE:GENERATE';
  private readonly logger: Logger = new Logger('FileStructureHandler');

  /**
   * Executes the handler to generate the file structure.
   * @param context - The builder context containing configuration and utilities.
   * @param args - The variadic arguments required for generating the file structure.
   * @returns A BuildResult containing the generated file structure JSON and related data.
   */
  async run(context: BuilderContext, ...args: any[]): Promise<BuildResult> {
    this.logger.log('Generating File Structure Document...');

    // Retrieve projectName from context
    const projectName =
      context.getData('projectName') || 'Default Project Name';
    this.logger.debug(`Project Name: ${projectName}`);

    // Validate and extract args
    if (!args || !Array.isArray(args)) {
      throw new Error(
        'File structure generation requires specific configuration arguments as an array.',
      );
    }

    // Destructure arguments with type assertion
    const [sitemapDoc, dataAnalysisDoc, framework, projectPart] =
      args as FileStructureArgs;

    // Validate required arguments
    if (!sitemapDoc || typeof sitemapDoc !== 'string') {
      throw new Error(
        'The first argument (sitemapDoc) is required and must be a string.',
      );
    }
    if (!dataAnalysisDoc || typeof dataAnalysisDoc !== 'string') {
      throw new Error(
        'The second argument (dataAnalysisDoc) is required and must be a string.',
      );
    }
    if (!framework || typeof framework !== 'string') {
      throw new Error(
        'The third argument (framework) is required and must be a string.',
      );
    }
    if (
      !projectPart ||
      (projectPart !== 'frontend' && projectPart !== 'backend')
    ) {
      throw new Error(
        'The fourth argument (projectPart) is required and must be either "frontend" or "backend".',
      );
    }

    this.logger.debug(`Project Part: ${projectPart}`);
    this.logger.debug(
      'Sitemap Documentation and Data Analysis Document are provided.',
    );

    // Generate the common file structure prompt
    const prompt = prompts.generateCommonFileStructurePrompt(
      projectName,
      sitemapDoc,
      dataAnalysisDoc,
      framework,
      projectPart,
    );

    let fileStructureContent: string;
    try {
      // Invoke the language model to generate the file structure content
      fileStructureContent = await context.model.chatSync(
        {
          content: prompt,
        },
        'gpt-4o-mini', // Specify the model variant as needed
      );
    } catch (error) {
      this.logger.error('Error during file structure generation:', error);
      return {
        success: false,
        error: new Error('Failed to generate file structure.'),
      };
    }

    this.logger.debug('Generated file structure content.');

    // Convert the tree structure to JSON using the appropriate prompt
    const convertToJsonPrompt =
      prompts.convertTreeToJsonPrompt(fileStructureContent);

    let fileStructureJsonContent: string | null = null;
    let successBuild = false;
    let retry = 0;
    const retryChances = 2;

    while (!successBuild) {
      if (retry > retryChances) {
        this.logger.error(
          'Failed to build virtual directory after multiple attempts.',
        );
        return {
          success: false,
          error: new Error(
            'Failed to build virtual directory after multiple attempts.',
          ),
        };
      }

      try {
        // Invoke the language model to convert tree structure to JSON
        fileStructureJsonContent = await context.model.chatSync(
          {
            content: convertToJsonPrompt,
          },
          'gpt-4o-mini', // Specify the model variant as needed
        );
      } catch (error) {
        this.logger.error('Error during tree to JSON conversion:', error);
        return {
          success: false,
          error: new Error('Failed to convert file structure to JSON.'),
        };
      }

      this.logger.debug('Converted file structure to JSON.');

      // Attempt to build the virtual directory from the JSON structure
      try {
        successBuild = context.buildVirtualDirectory(fileStructureJsonContent);
      } catch (error) {
        this.logger.error('Error during virtual directory build:', error);
        successBuild = false;
      }

      if (!successBuild) {
        this.logger.warn(
          `Retrying to build virtual directory (${retry + 1}/${retryChances})...`,
        );
        retry += 1;
      }
    }

    this.logger.log(
      'File structure JSON content and virtual directory built successfully.',
    );

    return {
      success: true,
      data: fileStructureJsonContent,
    };
  }
}
