import { Logger } from '@nestjs/common';

export class FileUtil {
  private static readonly logger = new Logger('FileUtil');

  /**
   * Extract JSON data from Markdown content.
   * @param markdownContent The Markdown content containing the JSON.
   */
  static extractJsonFromMarkdown(markdownContent: string): {
    files: Record<string, { dependsOn: string[] }>;
  } {
    const jsonMatch = /<GENERATEDCODE>([\s\S]*?)<\/GENERATEDCODE>/m.exec(
      markdownContent,
    );
    if (!jsonMatch) {
      FileUtil.logger.error('No JSON found in the provided Markdown content.');
      return null;
    }

    try {
      return JSON.parse(jsonMatch[1]);
    } catch (error) {
      FileUtil.logger.error(
        'Invalid JSON format in the Markdown content: ' + error,
      );
      return null;
    }
  }
}
