import { Logger } from '@nestjs/common';
import { ResponseTagError } from '../errors';

const logger = new Logger('common-utils');

/**
 * Extract JSON data from Markdown content.
 * @param markdownContent The Markdown content containing the JSON.
 */
export function extractJsonFromMarkdown(markdownContent: string): {
  files: Record<string, { dependsOn: string[] }>;
} {
  const jsonMatch = /<GENERATE>([\s\S]*?)<\/GENERATE>/m.exec(markdownContent);
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

/**
 * Extracts content within <GENERATE> tags from a given string.
 * @param input - The input string containing <GENERATE> tags.
 * @returns The content within the <GENERATE> tags.
 * @throws Error if the <GENERATE> tags are missing or improperly formatted.
 */
export function parseGenerateTag(input: string): string {
  const generateTagRegex = /<GENERATE>([\s\S]*?)<\/GENERATE>/;
  const match = input.match(generateTagRegex);
  if (!match || match.length < 2) {
    throw new Error(
      'Invalid format: <GENERATE> tags are missing or improperly formatted.',
    );
  }
  return match[1].trim();
}

/**
 * Removes Markdown code block fences (e.g. ``` or ```javascript) from the given string.
 * This function will remove lines that contain triple backticks, leaving only the actual code content.
 *
 * @param input - The input string potentially containing Markdown code fences.
 * @returns The input string without Markdown code block fences.
 */
export function removeCodeBlockFences(input: string): string {
  return input
    .split('\n')
    .filter((line) => !line.trim().startsWith('```'))
    .join('\n')
    .trim();
}

export function formatResponse(response: string): string {
  try {
    return removeCodeBlockFences(
      parseGenerateTag(removeCodeBlockFences(response)),
    );
  } catch (error) {
    throw new ResponseTagError('Failed to format response: ' + error);
  }
}

export function extractJsonFromText(content: string): {
  files: Record<string, { dependsOn: string[] }>;
} {
  try {
    return JSON.parse(content);
  } catch (error) {
    logger.error('Invalid JSON format in the Markdown content: ' + error);
    throw new ResponseTagError('Failed to extract JSON from text.');
  }
}
