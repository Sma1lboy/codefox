import { existsSync, promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  getRootDir,
  getProjectsDir,
  getProjectPath,
} from 'src/config/common-path';

/**
 * Saves the generated code to a specific folder under the `projects` directory.
 * The folder is created using a UUID to ensure uniqueness.
 *
 * @param fileName - The name of the file to save.
 * @param content - The content of the file.
 * @returns The path where the file was saved.
 */
export async function saveGeneratedCode(
  fileName: string,
  content: string,
): Promise<string> {
  try {
    // Generate a unique UUID for the project folder
    const projectUUID = uuidv4();

    // Get the path to the UUID-based folder
    const projectPath = getProjectPath(projectUUID);
    if (!projectPath) {
      throw new Error('Project path is undefined.');
    }
    await fs.mkdir(projectPath, { recursive: true });

    // Resolve the full path for the file
    const filePath = path.join(projectPath, fileName);
    console.log('File Path:', filePath);

    // Write the content to the file
    await fs.writeFile(filePath, content, 'utf8');

    return projectPath;
  } catch (error) {
    console.error('Error saving generated code:', error);
    throw error;
  }
}
