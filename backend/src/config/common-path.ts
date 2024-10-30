import path from 'path';
import os from 'os';
import { existsSync, mkdirSync, promises } from 'fs-extra';
import { createHash } from 'crypto';

// Constants for base directories
const APP_NAME = 'codefox';
const ROOT_DIR = path.join(os.homedir(), `.${APP_NAME}`);
const CLIENT_CACHE_DIR = path.resolve(
  __dirname,
  '../../frontend/.codefox-client/.cache',
);

// Utility function to ensure a directory exists
const ensureDir = (dirPath: string): string => {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
};

// Root Directory Accessor
export const getRootDir = (): string => ensureDir(ROOT_DIR);

// Configuration Paths
export const getConfigDir = (): string =>
  ensureDir(path.join(getRootDir(), 'config'));
export const getConfigPath = (configName: string): string =>
  path.join(getConfigDir(), `${configName}.json`);

// Models Directory
export const getModelsDir = (): string =>
  ensureDir(path.join(getRootDir(), 'models'));
export const getModelPath = (modelName: string): string =>
  path.join(getModelsDir(), modelName);

// Project-Specific Paths
export const getProjectsDir = (): string =>
  ensureDir(path.join(getRootDir(), 'projects'));
export const getProjectPath = (projectId: string): string =>
  ensureDir(path.join(getProjectsDir(), projectId));
export const getProjectSourceDir = (projectId: string): string =>
  ensureDir(path.join(getProjectPath(projectId), 'src'));
export const getProjectGeneratedDir = (projectId: string): string =>
  ensureDir(path.join(getProjectPath(projectId), 'generated'));
export const getProjectTestsDir = (projectId: string): string =>
  ensureDir(path.join(getProjectPath(projectId), 'tests'));

// Database Paths
export const getDatabaseDir = (): string =>
  ensureDir(path.join(getRootDir(), 'data'));
export const getDatabasePath = (): string =>
  path.join(getDatabaseDir(), 'codefox.db');

// Vector Database (INDEX) Path
export const getIndexDir = (): string =>
  ensureDir(path.join(getRootDir(), 'INDEX'));
export const getIndexFilePath = (indexFileName: string): string =>
  path.join(getIndexDir(), indexFileName);

// Temporary files
export const getTempDir = (): string => {
  const tempDir = path.join(ROOT_DIR, '.codefox', 'temp');
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
};

// Client Cache Paths
export const getCacheDir = (): string => ensureDir(CLIENT_CACHE_DIR);
export const getUserCacheDir = (userId: string): string =>
  ensureDir(path.join(CLIENT_CACHE_DIR, hashUserId(userId)));
export const getProjectCacheDir = (userId: string, projectId: string): string =>
  ensureDir(path.join(getUserCacheDir(userId), projectId));

// Access or create content file within a project’s cache directory
export const getProjectContentPath = (
  userId: string,
  projectId: string,
  fileName: string,
): string => {
  return path.join(getProjectCacheDir(userId, projectId), fileName);
};

// Utility functions to read and write content files in the project cache directory
export const writeProjectContent = async (
  userId: string,
  projectId: string,
  fileName: string,
  content: string,
): Promise<void> => {
  const contentPath = getProjectContentPath(userId, projectId, fileName);
  await promises.writeFile(contentPath, content, 'utf8');
};

export const readProjectContent = async (
  userId: string,
  projectId: string,
  fileName: string,
): Promise<string> => {
  const contentPath = getProjectContentPath(userId, projectId, fileName);
  return promises.readFile(contentPath, 'utf8');
};

export const deleteProjectContent = async (
  userId: string,
  projectId: string,
  fileName: string,
): Promise<void> => {
  const contentPath = getProjectContentPath(userId, projectId, fileName);
  if (existsSync(contentPath)) {
    await promises.unlink(contentPath);
  }
};

// Helper function to hash user IDs
const hashUserId = (userId: string): string => {
  return createHash('md5').update(userId).digest('hex');
};

// Utility Functions
export const exists = (filePath: string): boolean => existsSync(filePath);

export const cleanTempDir = async (): Promise<void> => {
  const tempDir = getTempDir();
  const files = await promises.readdir(tempDir);
  await Promise.all(
    files.map((file) => promises.unlink(path.join(tempDir, file))),
  );
};

// Access Project Structure
export const getProjectStructure = (
  projectId: string,
): {
  root: string;
  src: string;
  generated: string;
  tests: string;
} => ({
  root: getProjectPath(projectId),
  src: getProjectSourceDir(projectId),
  generated: getProjectGeneratedDir(projectId),
  tests: getProjectTestsDir(projectId),
});
