import { Logger } from '@nestjs/common';
import { BuilderContext } from 'src/build-system/context';
import { BuildHandler, BuildResult } from 'src/build-system/types';
import { ModelProvider } from 'src/common/model-provider';
import { prompts } from './prompt';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import { MessageInterface } from 'src/common/model-provider/types';

export class UXSitemapStructurePagebyPageHandler
  implements BuildHandler<string>
{
  readonly id = 'op:UX:SMS:PAGEBYPAGE';
  readonly logger = new Logger('Level2UXSitemapStructureHandler');

  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.logger.log('Generating Level 2 UX Sitemap Structure Document...');

    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';
    const sitemapDoc = context.getNodeData('op:UX:SMS');
    const uxStructureDoc = context.getNodeData('op:UX:SMS');

    if (!projectName || !sitemapDoc || !uxStructureDoc) {
      return {
        success: false,
        data: 'Missing required arguments: projectName, sitemapDoc, or uxStructureDoc.',
      };
    }

    // Extract sections from the UX Structure Document
    const sections = this.extractAllSections(uxStructureDoc);

    if (sections.length === 0) {
      this.logger.error(
        'No valid sections found in the UX Structure Document.',
      );
      return {
        success: false,
        data: 'No valid sections found in the UX Structure Document.',
      };
    }

    // Process each section with the refined Level 2 prompt
    const modelProvider = ModelProvider.getInstance();
    const refinedSections = [];

    for (const section of sections) {
      const prompt = prompts.generateLevel2UXSiteMapStructrePrompt(
        projectName,
        'web', // TODO: Replace with dynamic platform if necessary
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
          
            Next, we will provide the specific UX Sitemap Structure section to be refine.`,
        },
        {
          role: 'user',
          content: `
            Here is the UX SiteMap Structre Section (SMS):
          
            ${section}
          
            Please generate the Full UX Sitemap Structre for this section now. Only provide the information in <page_gen>`,
        },
        {
          role: 'user',
          content: `Please add more detail about the Core Components within each <page_gen>.
      Specifically:
      - Provide a descriptive name for each Core Component (C#.X. [Component Name]) and why it exists on this page.
      - List possible states (Default, Hover, Clicked, etc.) and typical user interactions (click, drag, input).
      - Note any restrictions (login required, admin-only, etc.).
      - Identify the essential content displayed (what users need to see and why).
      - If any important elements or features appear to be missing, add them now to ensure a complete UX structure.`,
        },
      ];

      const refinedContent = await modelProvider.chatSync({
        model: 'gpt-4o',
        messages,
      });

      refinedSections.push(refinedContent);
    }

    // Convert refinedSections to a stringD
    const refinedDocument = `<UXStructureMap>\n${refinedSections.join('\n\n')}\n</UXStructureMap>`;

    this.logger.log(refinedDocument);

    return {
      success: true,
      data: refinedDocument,
    };
  }

  /**
   * Extracts all <page_gen> sections as raw strings, including the tags.
   * @param text The UX Structure Document content.
   * @returns Array of extracted sections as full strings.
   */
  private extractAllSections(text: string): string[] {
    const pageRegex = /<page_gen id="[^"]+">[\s\S]*?<\/page_gen>/g;
    return text.match(pageRegex) || [];
  }
}
