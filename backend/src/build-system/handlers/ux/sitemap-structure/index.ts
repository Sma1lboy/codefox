import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { ModelProvider } from 'src/common/model-provider';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import {
  RetryableError,
  NonRetryableError,
} from 'src/build-system/retry-handler';

// UXSMS: UX Sitemap Structure
export class UXSitemapStructureHandler implements BuildHandler<string> {
  readonly id = 'op:UX:SMS';
  private readonly logger = new Logger('UXSitemapStructureHandler');

  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.logger.log('Generating UX Sitemap Structure Document...');

    // Extract relevant data from the context
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';
    const sitemapDoc = context.getNodeData('op:UX:SMD');

    // Validate required parameters
    if (!projectName || typeof projectName !== 'string') {
      return {
        success: false,
        error: new NonRetryableError('Missing or invalid projectName.'),
      };
    }
    if (!sitemapDoc || typeof sitemapDoc !== 'string') {
      return {
        success: false,
        error: new NonRetryableError('Missing or invalid sitemap document.'),
      };
    }

    // Generate the prompt dynamically
    const prompt = prompts.generateUXSiteMapStructrePrompt(
      projectName,
      sitemapDoc,
      'web', // TODO: Change platform dynamically if necessary
    );

    try {
      // Generate UX Structure content using the language model
      const uxStructureContent = await context.model.chatSync({
        model: 'gpt-4o-mini',
        messages: [{ content: prompt, role: 'system' }],
      });

      if (!uxStructureContent || uxStructureContent.trim() === '') {
        throw new RetryableError(
          'Generated UX Sitemap Structure content is empty.',
        );
      }

      this.logger.log('Successfully generated UX Sitemap Structure content.');
      return {
        success: true,
        data: removeCodeBlockFences(uxStructureContent),
      };
    } catch (error) {
      if (error instanceof RetryableError) {
        this.logger.warn(
          `Retryable error during UX Sitemap Structure generation: ${error.message}`,
        );
        return {
          success: false,
          error,
        };
      }

      this.logger.error(
        'Non-retryable error during UX Sitemap Structure generation:',
        error,
      );
      return {
        success: false,
        error: new NonRetryableError(
          'Failed to generate UX Sitemap Structure document.',
        ),
      };
    }
  }
}
