import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { ModelProvider } from 'src/common/model-provider';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
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
      const uxDatamapContent = await context.model.chatSync({
        model: 'gpt-4o-mini',
        messages: [{ content: prompt, role: 'system' }],
      });

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
      if (error.message.includes('timeout')) {
        this.logger.error(
          'Timeout occurred while communicating with the model.',
        );
        throw new ResponseParsingError(
          'Timeout occurred while generating UX Data Map.',
        );
      }
      if (error.message.includes('service unavailable')) {
        this.logger.error('Model service is temporarily unavailable.');
        throw new ResponseParsingError(
          'Model service is temporarily unavailable.',
        );
      }
      if (error.message.includes('rate limit')) {
        this.logger.error('Rate limit exceeded during model communication.');
        throw new ResponseParsingError(
          'Rate limit exceeded while generating UX Data Map.',
        );
      }

      this.logger.error(
        'Unexpected error during UX Data Map generation:',
        error,
      );
      throw new ResponseParsingError(
        'Unexpected error during UX Data Map generation.',
      );
    }
  }
}
