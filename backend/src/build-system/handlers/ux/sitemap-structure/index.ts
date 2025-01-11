import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { ModelProvider } from 'src/common/model-provider';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import { MessageInterface } from 'src/common/model-provider/types';

// UXSMS: UX Sitemap Structure
export class UXSitemapStructureHandler implements BuildHandler<string> {
  readonly id = 'op:UX:SMS';
  readonly logger = new Logger('UXSitemapStructureHandler');

  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.logger.log('Generating UX Structure Document...');

    // extract relevant data from the context
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';
    const sitemapDoc = context.getNodeData('op:UX:SMD');

    if (!sitemapDoc) {
      return {
        success: false,
        error: new Error('Missing required parameters: sitemap'),
      };
    }

    const prompt = prompts.generateUXSiteMapStructrePrompt(
      projectName,
      'web', // TODO: Change platform dynamically if necessary
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
    
              Please generate the Full UX Sitemap Structre now, focusing on MVP features but ensuring each page has enough detail to be functional.`,
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
    ];

    const uxStructureContent = await context.model.chatSync({
      model: 'gpt-4o-mini',
      messages,
    });

    return {
      success: true,
      data: removeCodeBlockFences(uxStructureContent),
    };
  }
}
