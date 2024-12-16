import { Logger } from '@nestjs/common';
import fs from 'fs-extra';

const logger = new Logger('file-utils');
/**
 * Saves the given content to the specified file path using fs-extra.
 * Ensures that all directories in the path exist before writing the file.
 *
 * @param filePath - The complete file path including the file name.
 * @param content - The content to be written to the file.
 * @returns The file path where the content was written.
 * @throws Will throw an error if the file could not be written.
 */
export async function saveGeneratedCode(
  filePath: string,
  content: string,
): Promise<string> {
  try {
    // fs-extra's outputFile creates all directories if they don't exist
    await fs.outputFile(filePath, content, 'utf8');
    return filePath;
  } catch (error) {
    logger.error('Error saving generated code:', error);
    throw error;
  }
}
