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
  readonly logger = new Logger('UXSitemapStructurePagebyPageHandler');

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
    const sections = this.extractAllPageViewSections(uxStructureDoc);
    const globalSections = this.extractAllGlobalCompSections(uxStructureDoc);

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

    const globalComponentPrompt =
      prompts.generateGlobalComponentPagebyPageSiteMapStructrePrompt();

    const pageViewprompt = prompts.generatePagebyPageSiteMapStructrePrompt();

    this.logger.log('Processing each Global Component...');

    // Global Component
    for (const globalSection of globalSections) {
      const messages: MessageInterface[] = [
        {
          role: 'system',
          content: globalComponentPrompt,
        },
        {
          role: 'user',
          content: `
        This is the Global Components Section (GCS) of the UX SiteMap Structre (SMS) :
         ${globalSection} 

        Please generate the Full UX Sitemap Structre for this section now. Provide the information exclusively within <global_component> tags.
        `,
        },
        {
          role: 'user',
          content: `Please enrich the details of Core Components in each <global_component> block.
    Specifically:
    - **Descriptive Component Names**: Include a clear, meaningful name (C#.X. [Component Name]) and explain its purpose on this page.
    - **States and Interactions**: Define possible UI states (e.g., Default, Hover, Clicked) and describe typical user interactions (e.g., click, drag, input).
    - **Access Restrictions**: Note any conditions (e.g., login required, admin-only) that govern access to the component.`,
        },
      ];

      const refinedContent = await modelProvider.chatSync({
        model: 'gpt-4o',
        messages,
      });

      refinedSections.push(refinedContent);
    }

    this.logger.log('Processing each Page View...');

    // Page View
    for (const section of sections) {
      const messages: MessageInterface[] = [
        {
          role: 'system',
          content: pageViewprompt,
        },
        {
          role: 'user',
          content: `
          This is the Global Components Section (GCS) of the UX SiteMap Structre (SMS) :
           ${globalSections.join('\n\n')} 

           Use this as a reference for HTML Layouts and Component Placement. Next will provide UX SiteMap Structre Section (SMS)
          `,
        },
        {
          role: 'user',
          content: `
            Here is the UX SiteMap Structre Section (SMS):
          
            ${section}
          
            Please generate the Full UX Sitemap Structre for this section now. Provide the information exclusively within <page_view> tags.`,
        },
        // {
        //   role: 'user',
        //   content: `
        //   Next you need to generating a Draft HTML Layout for each <page_view>.
        //   Your output must emphasize component placement, layout context, and styling directions to ensure developers can implement a responsive and accessible UI effectively.
        //     ${prompts.HTML_Guidelines_Page_view_Prompt}
        //     `,
        // },
        {
          role: 'user',
          content: `Please enrich the details of Core Components in each <page_view> block.
      Specifically:
      - **Descriptive Component Names**: Include a clear, meaningful name (C#.X. [Component Name]) and explain its purpose on this page.
      - **States and Interactions**: Define possible UI states (e.g., Default, Hover, Clicked) and describe typical user interactions (e.g., click, drag, input).
      - **Access Restrictions**: Note any conditions (e.g., login required, admin-only) that govern access to the component.
      - **Essential Content**: Identify critical information displayed in the component and explain its importance to the user experience.
      - **Missing Elements**: Review the structure and add any components, features, or details that may be missing to ensure a complete and robust UX structure.`,
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
   * Extracts all <page_view> sections as raw strings, including the tags.
   * @param text The UX Structure Document content.
   * @returns Array of extracted sections as full strings.
   */
  private extractAllPageViewSections(text: string): string[] {
    const pageRegex = /<page_view id="[^"]+">[\s\S]*?<\/page_view>/g;
    return text.match(pageRegex) || [];
  }

  /**
   * Extracts all <global_component> sections as raw strings, including the tags.
   * @param text The UX Structure Document content.
   * @returns Array of extracted sections as full strings.
   */
  private extractAllGlobalCompSections(text: string): string[] {
    const pageRegex =
      /<global_component id="[^"]+">[\s\S]*?<\/global_component>/g;
    return text.match(pageRegex) || [];
  }
}
