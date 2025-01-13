import { Logger } from '@nestjs/common';
import { BuilderContext } from 'src/build-system/context';
import { BuildHandler, BuildResult } from 'src/build-system/types';
import { ModelProvider } from 'src/common/model-provider';
import { prompts } from './prompt';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import {
  MissingConfigurationError,
  ResponseParsingError,
} from 'src/build-system/errors';

export class Level2UXSitemapStructureHandler implements BuildHandler<string> {
  readonly id = 'op:UX:SMS:LEVEL2';
  private readonly logger = new Logger('Level2UXSitemapStructureHandler');

  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.logger.log('Generating Level 2 UX Sitemap Structure Document...');

    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';
    const sitemapDoc = context.getNodeData('op:UX:SMS');
    const uxStructureDoc = context.getNodeData('op:UX:SMS');

    // Validate required data
    if (!projectName || typeof projectName !== 'string') {
      throw new MissingConfigurationError('Missing or invalid projectName.');
    }
    if (!sitemapDoc || typeof sitemapDoc !== 'string') {
      throw new MissingConfigurationError(
        'Missing or invalid sitemap document.',
      );
    }
    if (!uxStructureDoc || typeof uxStructureDoc !== 'string') {
      throw new MissingConfigurationError(
        'Missing or invalid UX Structure document.',
      );
    }

    // Extract sections from the UX Structure Document
    const sections = this.extractAllSections(uxStructureDoc);

    if (sections.length === 0) {
      this.logger.error(
        'No valid sections found in the UX Structure Document.',
      );
      throw new ResponseParsingError(
        'No valid sections found in the UX Structure Document.',
      );
    }

    // Process each section with the refined Level 2 prompt
    const modelProvider = ModelProvider.getInstance();
    const refinedSections = [];

    for (const section of sections) {
      try {
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

        if (!refinedContent || refinedContent.trim() === '') {
          this.logger.error(
            `Generated content for section "${section.title}" is empty.`,
          );
          throw new ResponseParsingError(
            `Generated content for section "${section.title}" is empty.`,
          );
        }

        refinedSections.push({
          title: section.title,
          content: refinedContent,
        });
      } catch (error) {
        if (error.message.includes('timeout')) {
          this.logger.warn(
            `Timeout error during section refinement: ${error.message}`,
          );
          throw new ResponseParsingError(
            'Timeout occurred while refining sections.',
          );
        }
        if (error.message.includes('service unavailable')) {
          this.logger.warn(
            `Service unavailable during section refinement: ${error.message}`,
          );
          throw new ResponseParsingError(
            'Model service is temporarily unavailable.',
          );
        }
        if (error.message.includes('rate limit')) {
          this.logger.warn(
            `Rate limit exceeded during section refinement: ${error.message}`,
          );
          throw new ResponseParsingError(
            'Rate limit exceeded while refining sections.',
          );
        }

        this.logger.error(
          `Unexpected error during section refinement for "${section.title}":`,
          error,
        );
        throw new ResponseParsingError(
          `Unexpected error during section refinement for "${section.title}".`,
        );
      }
    }

    // Combine the refined sections into the final document
    const refinedDocument = refinedSections
      .map((section) => `## **${section.title}**\n${section.content}`)
      .join('\n\n');

    this.logger.log(
      'Successfully generated Level 2 UX Sitemap Structure document.',
    );

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

    if (sections.length === 0) {
      this.logger.warn('No sections found in the UX Structure document.');
    }

    return sections;
  }
}
