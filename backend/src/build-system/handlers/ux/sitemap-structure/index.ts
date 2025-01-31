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
import { UXSMDHandler } from '../sitemap-document';
import { BuildNode, BuildNodeRequire } from 'src/build-system/hanlder-manager';

/**
 * UXSMS: UX Sitemap Structure
 **/

@BuildNode()
@BuildNodeRequire([UXSMDHandler])
export class UXSMSHandler implements BuildHandler<string> {
  private readonly logger = new Logger('UXSitemapStructureHandler');

  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.logger.log('Generating UX Sitemap Structure Document...');

    // Extract relevant data from the context
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';
    const sitemapDoc = context.getNodeData(UXSMDHandler);

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

    const prompt = prompts.generateUXSiteMapStructurePrompt(
      projectName,
      platform, // TODO: Change platform dynamically if necessary
    );

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
      {
        role: 'user',
        content: `Please add more detail about the Core Components within each <page_gen>.
      Specifically:
      - Provide a descriptive name for each Core Component (e.g., “C1.1. SearchBar”).
      - List possible states (Default, Hover, etc.) and typical user interactions (click, scroll, etc.).
      - Clarify how these components support user goals and why they exist on that page.`,
      },
      {
        role: 'user',
        content: `
          Finally, please ensure each page includes at least one user flow under "Page-Specific User Flows",
          illustrating step-by-step how a user accomplishes a key goal on that page.
          If the SMD mentions additional flows, add them here. 
          Confirm any login or access restrictions, too.
        `,
      },
      {
        role: 'user',
        content:
          'Also, make sure all pages are beginning with  <page_view id="[id]"> and ending with </page_view> tags. You should follow the rule from system prompt',
      },
    ];

    try {
      const uxStructureContent = await chatSyncWithClocker(
        context,
        {
          model: 'gpt-4o-mini',
          messages,
        },
        'generateUXSiteMapStructre',
        UXSMSHandler.name,
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
