import path from 'path';
import os from 'os';
import { existsSync, mkdirSync, promises } from 'fs-extra';
import { createHash } from 'crypto';

// Constants for base directories
const CLIENT_CACHE_DIR = path.resolve(__dirname, '../.codefox-client/.cache');

// Utility function to ensure a directory exists
const ensureDir = (dirPath: string): string => {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
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
  fileName: string
): string => {
  return path.join(getProjectCacheDir(userId, projectId), fileName);
};

// Utility functions to read and write content files in the project cache directory
export const writeProjectContent = async (
  userId: string,
  projectId: string,
  fileName: string,
  content: string
): Promise<void> => {
  const contentPath = getProjectContentPath(userId, projectId, fileName);
  await promises.writeFile(contentPath, content, 'utf8');
};

export const readProjectContent = async (
  userId: string,
  projectId: string,
  fileName: string
): Promise<string> => {
  const contentPath = getProjectContentPath(userId, projectId, fileName);
  return promises.readFile(contentPath, 'utf8');
};

export const deleteProjectContent = async (
  userId: string,
  projectId: string,
  fileName: string
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

// Access Project Structure
export const getProjectStructure = (
  userId: string,
  projectId: string
): {
  root: string;
  content: string;
} => ({
  root: getProjectCacheDir(userId, projectId),
  content: path.join(getProjectCacheDir(userId, projectId), 'content'),
});
