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
   * Root Directory
   */
  public static getRootDir(): string {
    return CodeFoxPaths.ROOT_DIR;
  }

  /**
   * Models Directory
   */
  public static getModelsDir(): string {
    return path.join(CodeFoxPaths.ROOT_DIR, 'models');
  }

  public static getModelPath(modelName: string): string {
    return path.join(CodeFoxPaths.getModelsDir(), modelName);
  }

  /**
   * Projects Directory
   */
  public static getProjectsDir(): string {
    return path.join(CodeFoxPaths.ROOT_DIR, 'projects');
  }

  public static getProjectPath(projectId: string): string {
    return path.join(CodeFoxPaths.getProjectsDir(), projectId);
  }

  public static getProjectSourceDir(projectId: string): string {
    return path.join(CodeFoxPaths.getProjectPath(projectId), 'src');
  }

  public static getProjectGeneratedDir(projectId: string): string {
    return path.join(CodeFoxPaths.getProjectPath(projectId), 'generated');
  }

  public static getProjectTestsDir(projectId: string): string {
    return path.join(CodeFoxPaths.getProjectPath(projectId), 'tests');
  }

  /**
   * Database
   */
  public static getDatabaseDir(): string {
    return path.join(CodeFoxPaths.ROOT_DIR, 'data');
  }

  public static getDatabasePath(): string {
    return path.join(CodeFoxPaths.getDatabaseDir(), 'codefox.db');
  }

  /**
   * Configuration
   */
  public static getConfigDir(): string {
    return path.join(CodeFoxPaths.ROOT_DIR, 'config');
  }

  public static getConfigPath(configName: string): string {
    return path.join(CodeFoxPaths.getConfigDir(), `${configName}.json`);
  }

  /**
   * Cache
   */
  public static getCacheDir(): string {
    return path.join(CodeFoxPaths.ROOT_DIR, 'cache');
  }

  /**
   * Logs
   */
  public static getLogsDir(): string {
    return path.join(CodeFoxPaths.ROOT_DIR, 'logs');
  }

  /**
   * Temporary files
   */
  public static getTempDir(): string {
    return path.join(CodeFoxPaths.ROOT_DIR, 'temp');
  }

  /**
   * Templates
   */
  public static getTemplatesDir(): string {
    return path.join(CodeFoxPaths.ROOT_DIR, 'templates');
  }

  public static getPromptTemplatePath(templateName: string): string {
    return path.join(CodeFoxPaths.getTemplatesDir(), `${templateName}.txt`);
  }

  /**
   * Initialization
   */
  public static initializeDirectories(): void {
    const directories = [
      CodeFoxPaths.ROOT_DIR,
      CodeFoxPaths.getModelsDir(),
      CodeFoxPaths.getProjectsDir(),
      CodeFoxPaths.getConfigDir(),
      CodeFoxPaths.getCacheDir(),
      CodeFoxPaths.getLogsDir(),
      CodeFoxPaths.getTempDir(),
      CodeFoxPaths.getTemplatesDir(),
      CodeFoxPaths.getDatabaseDir(),
    ];

    directories.forEach((dir) => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Project Structure Management
   */
  public static createProjectStructure(projectId: string): {
    root: string;
    src: string;
    generated: string;
    tests: string;
  } {
    const projectRoot = CodeFoxPaths.getProjectPath(projectId);
    const srcDir = CodeFoxPaths.getProjectSourceDir(projectId);
    const generatedDir = CodeFoxPaths.getProjectGeneratedDir(projectId);
    const testsDir = CodeFoxPaths.getProjectTestsDir(projectId);

    [projectRoot, srcDir, generatedDir, testsDir].forEach((dir) => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });

    return {
      root: projectRoot,
      src: srcDir,
      generated: generatedDir,
      tests: testsDir,
    };
  }

  /**
   * Utility Methods
   */
  public static resolvePath(...pathSegments: string[]): string {
    return path.join(CodeFoxPaths.ROOT_DIR, ...pathSegments);
  }

  public static exists(filePath: string): boolean {
    return existsSync(filePath);
  }

  public static async cleanTempDir(): Promise<void> {
    const tempDir = CodeFoxPaths.getTempDir();
    if (existsSync(tempDir)) {
      const files = await promises.readdir(tempDir);
      for (const file of files) {
        await promises.unlink(path.join(tempDir, file));
      }
    }
  }

  public static async exportProjectStructure(
    projectId: string,
  ): Promise<object> {
    const projectRoot = CodeFoxPaths.getProjectPath(projectId);
    if (!existsSync(projectRoot)) {
      throw new Error(`Project ${projectId} does not exist`);
    }

    return {
      projectId,
      paths: {
        root: projectRoot,
        src: CodeFoxPaths.getProjectSourceDir(projectId),
        generated: CodeFoxPaths.getProjectGeneratedDir(projectId),
        tests: CodeFoxPaths.getProjectTestsDir(projectId),
      },
    };
  }
}
