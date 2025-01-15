import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import { chatSyncWithClocker } from 'src/build-system/utils/handler-helper';
import { MessageInterface } from 'src/common/model-provider/types';
import {
  MissingConfigurationError,
  ResponseParsingError,
} from 'src/build-system/errors';

/**
 * Handler for generating the UX Data Map document.
 */
export class UXDatamapHandler implements BuildHandler<string> {
  readonly id = 'op:UX:DATAMAP:DOC';
  private readonly logger = new Logger('UXDatamapHandler');

  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.logger.log('Generating UX Data Map Document...');

    // Extract relevant data from the context
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';
    const sitemapDoc = context.getNodeData('op:UX:SMD');

    // Validate required data
    if (!projectName || typeof projectName !== 'string') {
      throw new MissingConfigurationError('Missing or invalid projectName.');
    }
    if (!sitemapDoc || typeof sitemapDoc !== 'string') {
      throw new MissingConfigurationError('Missing or invalid sitemapDoc.');
    }

    // Generate the prompt
    const prompt = prompts.generateUXDataMapPrompt(
      projectName,
      sitemapDoc,
      'web', // TODO: change platform dynamically if needed
    );

    try {
      // Generate UX Data Map content using the language model
      const messages: MessageInterface[] = [
        { content: prompt, role: 'system' },
      ];
      const uxDatamapContent = await chatSyncWithClocker(
        context,
        messages,
        'gpt-4o-mini',
        'generateUXDataMap',
        this.id,
      );
      if (!uxDatamapContent || uxDatamapContent.trim() === '') {
        throw new ResponseParsingError(
          'Generated UX Data Map content is empty.',
        );
      }

      this.logger.log('Successfully generated UX Data Map content.');
      return {
        success: true,
        data: removeCodeBlockFences(uxDatamapContent),
      };
    } catch (error) {
      throw error;
    }
  }
}
