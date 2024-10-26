import path from 'path';
import os from 'os';
import { name } from '../../package.json';
import { existsSync, mkdirSync, promises } from 'fs-extra';

export class CodeFoxPaths {
  private static readonly APP_NAME = name;
  private static readonly ROOT_DIR = path.join(
    os.homedir(),
    `.${CodeFoxPaths.APP_NAME}`,
  );

  /**
   * Internal helper to ensure a directory exists before returning its path
   * @param dirPath The directory path to check/create
   * @returns The same directory path
   */
  private static ensureDir(dirPath: string): string {
    if (!existsSync(path.dirname(dirPath))) {
      this.ensureDir(path.dirname(dirPath));
    }
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
    return dirPath;
  }

  /**
   * Root Directory
   */
  public static getRootDir(): string {
    return this.ensureDir(CodeFoxPaths.ROOT_DIR);
  }

  /**
   * Models Directory
   */
  public static getModelsDir(): string {
    return this.ensureDir(path.join(this.getRootDir(), 'models'));
  }

  public static getModelPath(modelName: string): string {
    return path.join(this.getModelsDir(), modelName);
  }

  /**
   * Projects Directory
   */
  public static getProjectsDir(): string {
    return this.ensureDir(path.join(this.getRootDir(), 'projects'));
  }

  public static getProjectPath(projectId: string): string {
    return this.ensureDir(path.join(this.getProjectsDir(), projectId));
  }

  public static getProjectSourceDir(projectId: string): string {
    return this.ensureDir(path.join(this.getProjectPath(projectId), 'src'));
  }

  public static getProjectGeneratedDir(projectId: string): string {
    return this.ensureDir(
      path.join(this.getProjectPath(projectId), 'generated'),
    );
  }

  public static getProjectTestsDir(projectId: string): string {
    return this.ensureDir(path.join(this.getProjectPath(projectId), 'tests'));
  }

  /**
   * Database
   */
  public static getDatabaseDir(): string {
    return this.ensureDir(path.join(this.getRootDir(), 'data'));
  }

  public static getDatabasePath(): string {
    this.getDatabaseDir(); // Ensure database directory exists
    return path.join(this.getDatabaseDir(), 'codefox.db');
  }

  /**
   * Configuration
   */
  public static getConfigDir(): string {
    return this.ensureDir(path.join(this.getRootDir(), 'config'));
  }

  public static getConfigPath(configName: string): string {
    this.getConfigDir(); // Ensure config directory exists
    return path.join(this.getConfigDir(), `${configName}.json`);
  }

  /**
   * Cache
   */
  public static getCacheDir(): string {
    return this.ensureDir(path.join(this.getRootDir(), 'cache'));
  }

  /**
   * Logs
   */
  public static getLogsDir(): string {
    return this.ensureDir(path.join(this.getRootDir(), 'logs'));
  }

  /**
   * Temporary files
   */
  public static getTempDir(): string {
    return this.ensureDir(path.join(this.getRootDir(), 'temp'));
  }

  /**
   * Templates
   */
  public static getTemplatesDir(): string {
    return this.ensureDir(path.join(this.getRootDir(), 'templates'));
  }

  public static getPromptTemplatePath(templateName: string): string {
    this.getTemplatesDir(); // Ensure templates directory exists
    return path.join(this.getTemplatesDir(), `${templateName}.txt`);
  }

  /**
   * Utility Methods
   */
  public static resolvePath(...pathSegments: string[]): string {
    const resolvedPath = path.join(this.getRootDir(), ...pathSegments);
    return this.ensureDir(path.dirname(resolvedPath));
  }

  public static exists(filePath: string): boolean {
    return existsSync(filePath);
  }

  public static async cleanTempDir(): Promise<void> {
    const tempDir = this.getTempDir();
    const files = await promises.readdir(tempDir);
    await Promise.all(
      files.map((file) => promises.unlink(path.join(tempDir, file))),
    );
  }

  public static getProjectStructure(projectId: string): {
    root: string;
    src: string;
    generated: string;
    tests: string;
  } {
    return {
      root: this.getProjectPath(projectId),
      src: this.getProjectSourceDir(projectId),
      generated: this.getProjectGeneratedDir(projectId),
      tests: this.getProjectTestsDir(projectId),
    };
  }
}
