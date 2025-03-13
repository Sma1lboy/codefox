import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import { chatSyncWithClocker } from 'src/build-system/utils/handler-helper';
import { MessageInterface } from 'src/common/model-provider/types';
import {
  MissingConfigurationError,
  ModelUnavailableError,
  ResponseParsingError,
} from 'src/build-system/errors';
import { BuildNode, BuildNodeRequire } from 'src/build-system/hanlder-manager';
import { UXSMSHandler } from '../sitemap-structure';

/**
 * UXSMS: UX Sitemap Structure
 **/

@BuildNode()
@BuildNodeRequire([UXSMSHandler])
export class UIUXLayoutHandler implements BuildHandler<string> {
  private readonly logger = new Logger('UIUXLayoutHandler');

  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.logger.log('Generating UX UX Layout Document...');

    // Extract relevant data from the context
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';
    const sitemapDoc = context.getNodeData(UXSMSHandler);

    const platform = context.getGlobalContext('platform') || 'Default Platform';

    // Validate required parameters
    if (!projectName || typeof projectName !== 'string') {
      throw new MissingConfigurationError('Missing or invalid projectName.');
    }
    if (!sitemapDoc || typeof sitemapDoc !== 'string') {
      throw new MissingConfigurationError(
        'Missing or invalid sitemap document.',
      );
    }

    const prompt = prompts.generateUIUXLayoutPrompt();

    const messages: MessageInterface[] = [
      {
        role: 'system',
        content: prompt,
      },
      {
        role: 'user',
        content: `
              Here is the UX Sitemap Documentation (SMD):
    
              ${sitemapDoc}
    
              Please generate the Full UX Sitemap Structre now, focusing on MVP features but ensuring each page has enough detail to be functional. You Must Provide all the page_view`,
      },
      {
        role: 'user',
        content: `Check if you covered all major pages, user flows, and any global components mentioned in the SMD.
      If anything is missing, please add it now. Also, expand on how each <global_comp> is used across pages.`,
      },
    ];

    try {
      const uxStructureContent = await chatSyncWithClocker(
        context,
        {
          model: context.defaultModel || 'gpt-4o-mini',
          messages,
        },
        'generateUIUXLayout',
        UIUXLayoutHandler.name,
      );

      if (!uxStructureContent || uxStructureContent.trim() === '') {
        this.logger.error('Generated UX Sitemap Structure content is empty.');
        throw new ResponseParsingError(
          'Generated UX Sitemap Structure content is empty.',
        );
      }

      this.logger.log('Successfully generated UX Sitemap Structure content.');
      return {
        success: true,
        data: removeCodeBlockFences(uxStructureContent),
      };
    } catch (error) {
      throw new ModelUnavailableError('Model is unavailable: ' + error);
    }
  }
}
