import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { ModelProvider } from 'src/common/model-provider';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';

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
      sitemapDoc,
      'web', // TODO: Change platform dynamically if necessary
    );

    const uxStructureContent = await context.model.chatSync({
      model: 'gpt-4o-mini',
      messages: [{ content: prompt, role: 'system' }],
    });

    return {
      success: true,
      data: removeCodeBlockFences(uxStructureContent),
    };
  }
}
export class Level2UXSitemapStructureHandler implements BuildHandler<string> {
  readonly id = 'op:UX:SMS:LEVEL2';
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
        section.content,
        sitemapDoc,
        'web', // TODO: Replace with dynamic platform if necessary
      );

      const refinedContent = await modelProvider.chatSync({
        model: 'gpt-4o-mini',
        messages: [{ content: prompt, role: 'system' }],
      });

      refinedSections.push({
        title: section.title,
        content: refinedContent,
      });
    }

    // Combine the refined sections into the final document
    const refinedDocument = refinedSections
      .map((section) => `## **${section.title}**\n${section.content}`)
      .join('\n\n');

    this.logger.log(refinedDocument);

    return {
      success: true,
      data: removeCodeBlockFences(refinedDocument),
    };
  }

  /**
   * Extracts all sections from a given text.
   * @param text The UX Structure Document content.
   * @returns Array of extracted sections with title and content.
   */
  private extractAllSections(
    text: string,
  ): Array<{ title: string; content: string }> {
    const regex = /## \*\*(\d+\.\s.*)\*\*([\s\S]*?)(?=\n## \*\*|$)/g;
    const sections = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      const title = match[1].trim();
      const content = match[2].trim();
      sections.push({ title, content });
    }

    return sections;
  }
}
