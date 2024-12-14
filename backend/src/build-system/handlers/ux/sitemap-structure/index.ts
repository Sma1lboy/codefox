import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { ModelProvider } from 'src/common/model-provider';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';

// UXSMS: UX Sitemap Structure
export class UXSitemapStructureHandler implements BuildHandler {
  readonly id = 'op:UXSMS::STATE:GENERATE';
  readonly logger = new Logger('UXSitemapStructureHandler');

  async run(context: BuilderContext, args: unknown): Promise<BuildResult> {
    this.logger.log('Generating UX Structure Document...');

    // extract relevant data from the context
    const projectName =
      context.getData('projectName') || 'Default Project Name';

    const sitemap = args[0] as string;

    if (!sitemap) {
      return {
        success: false,
        error: new Error('Missing required parameters: sitemap'),
      };
    }

    const prompt = prompts.generateUXSiteMapStructrePrompt(
      projectName,
      JSON.stringify(sitemap, null, 2),
      // TODO: change later
      'web',
    );
    this.logger.log(prompt);
    const uxStructureContent = await context.model.chatSync(
      {
        content: prompt,
      },
      'gpt-4o-mini',
    );
    return {
      success: true,
      data: uxStructureContent,
    };
  }
}

export class Level2UXSitemapStructureHandler implements BuildHandler {
  readonly id = 'op:LEVEL2_UXSMS::STATE:GENERATE';
  readonly logger = new Logger('Level2UXSitemapStructureHandler');

  async run(context: BuilderContext, args: unknown): Promise<BuildResult> {
    this.logger.log('Generating Level 2 UX Sitemap Structure Document...');

    // Extract necessary data from the context
    const { projectName, sitemapDoc, uxStructureDoc } = args as {
      projectName: string;
      sitemapDoc: string;
      uxStructureDoc: string;
    };

    // Ensure the UX Structure Document exists
    if (!projectName || !sitemapDoc || !uxStructureDoc) {
      throw new Error(
        'Missing required arguments: projectName, sitemapDoc, or uxStructureDoc.',
      );
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

      // Generate refined UX Structure content
      const refinedContent = await modelProvider.chatSync(
        { content: prompt },
        'gpt-4o-mini',
      );

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
      data: refinedDocument,
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