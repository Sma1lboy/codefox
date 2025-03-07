import { promises as fs } from 'fs';
import * as path from 'path';
import { getProjectsDir } from 'codefox-common';

export class FileReader {
  private static instance: FileReader;
  private basePath: string;

  private constructor() {
    const baseDir = getProjectsDir();
    this.basePath = path.resolve(baseDir);
  }

  public static getInstance(): FileReader {
    if (!FileReader.instance) {
      FileReader.instance = new FileReader();
    }
    return FileReader.instance;
  }

  public async getAllPaths(projectId: string): Promise<string[]> {
    const projectPath = path.resolve(this.basePath, projectId);
    return this.readDirectory(projectPath);
  }

  public async getAllShallowPaths(): Promise<string[]> {
    return this.readShallowDirectory(this.basePath);
  }

  public async readFileContent(filePath: string): Promise<string> {
    const fullPath = path.join(this.basePath, filePath);

    try {
      return await fs.readFile(fullPath, 'utf-8');
    } catch (err) {
      console.error(`Error reading file: ${fullPath}`, err);
      throw new Error(`Failed to read file: ${fullPath}`);
    }
  }

  private async readDirectory(dir: string): Promise<string[]> {
    let filePaths: string[] = [];

    try {
      const items = await fs.readdir(dir, { withFileTypes: true });

      for (const item of items) {
        if (item.name.includes('node_modules')) continue;
        const fullPath = path.join(dir, item.name);
        const relativePath = path.relative(this.basePath, fullPath);

        filePaths.push(relativePath);

        if (item.isDirectory()) {
          filePaths = filePaths.concat(await this.readDirectory(fullPath));
        }
      }
    } catch (err) {
      console.error(`Error reading directory: ${dir}`, err);
    }
    return filePaths;
  }

  private async readShallowDirectory(dir: string): Promise<string[]> {
    const filePaths: string[] = [];

    try {
      const items = await fs.readdir(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        filePaths.push(path.relative(this.basePath, fullPath));
      }
    } catch (err) {
      console.error(`Error reading directory: ${dir}`, err);
    }
    return filePaths;
  }

  public async updateFile(filePath: string, newContent: string): Promise<void> {
    if (filePath.includes('..')) {
      console.error('[FileReader] Invalid file path detected:', filePath);
      throw new Error('Invalid file path');
    }

    const fullPath = path.join(this.basePath, filePath);
    console.log(`📝 [FileReader] Updating file: ${fullPath}`);

    try {
      const content = JSON.parse(newContent);
      await fs.writeFile(fullPath, content, 'utf-8');

      console.log('[FileReader] File updated successfully');
    } catch (err) {
      console.error(`[FileReader] Error updating file: ${fullPath}`, err);
      throw new Error(`Failed to update file: ${fullPath}`);
    }
  }
}
