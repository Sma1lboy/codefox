import { Logger } from '@nestjs/common';
import * as fs from 'fs-extra';
import { getProjectPath } from 'src/config/common-path';

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

/**
 * Copies a project template to a specific location under a given UUID folder.
 *
 * @param templatePath - The path to the project template containing files.
 * @param projectUUID - The UUID of the project folder.
 * @returns The path to the copied project directory.
 */
export async function copyProjectTemplate(
  templatePath: string,
  projectUUID: string,
): Promise<string> {
  try {
    // Validate the template path
    const templateExists = await fs
      .access(templatePath)
      .then(() => true)
      .catch(() => false);
    if (!templateExists) {
      throw new Error(`Template path does not exist: ${templatePath}`);
    }

    // Resolve the destination path and ensure path exist
    const destinationPath = getProjectPath(projectUUID);

    // Copy the template to the destination
    logger.log(
      `Copying template from ${templatePath} to ${destinationPath}...`,
    );
    await fs.copy(templatePath, destinationPath);

    // Return the destination path
    logger.log(`Template copied successfully to ${destinationPath}`);
    return destinationPath;
  } catch (error) {
    logger.error('Error copying project template:', error);
    throw error;
  }
}
