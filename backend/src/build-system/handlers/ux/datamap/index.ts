import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import { chatSyncWithClocker } from 'src/build-system/utils/handler-helper';
import {
  MissingConfigurationError,
  ModelUnavailableError,
} from 'src/build-system/errors';
import { BuildNode, BuildNodeRequire } from 'src/build-system/hanlder-manager';
import { UXSMDHandler } from '../sitemap-document';

/**
 * Handler for generating the UX Data Map document.
 */
@BuildNode()
@BuildNodeRequire([UXSMDHandler])
export class UXDMDHandler implements BuildHandler<string> {
  private readonly logger = new Logger('UXDatamapHandler');

  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.logger.log('Generating UX Data Map Document...');

    // Extract relevant data from the context
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';
    const platform = context.getGlobalContext('platform') || 'Default Platform';
    const sitemapDoc = context.getNodeData(UXSMDHandler);

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
      platform, // TODO: change platform dynamically if needed
    );

    try {
      // Generate UX Data Map content using the language model
      const uxDatamapContent = await chatSyncWithClocker(
        context,
        {
          model: context.defaultModel || 'gpt-4o-mini',
          messages: [{ content: prompt, role: 'system' }],
        },
        'generateUXDataMap',
        UXDMDHandler.name,
      );

      this.logger.log('Successfully generated UX Data Map content.');
      return {
        success: true,
        data: removeCodeBlockFences(uxDatamapContent),
      };
    } catch (error) {
      throw new ModelUnavailableError('Model is unavailable:' + error);
    }
  }
}
