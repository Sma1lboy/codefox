import { Logger } from '@nestjs/common';

const logger = new Logger('common-utils');

/**
 * Extract JSON data from Markdown content.
 * @param markdownContent The Markdown content containing the JSON.
 */
export function extractJsonFromMarkdown(markdownContent: string): {
  files: Record<string, { dependsOn: string[] }>;
} {
  const jsonMatch = /<GENERATEDCODE>([\s\S]*?)<\/GENERATEDCODE>/m.exec(
    markdownContent,
  );
  if (!jsonMatch) {
    logger.error('No JSON found in the provided Markdown content.');
    return null;
  }

  try {
    return JSON.parse(jsonMatch[1]);
  } catch (error) {
    logger.error('Invalid JSON format in the Markdown content: ' + error);
    return null;
  }
}
