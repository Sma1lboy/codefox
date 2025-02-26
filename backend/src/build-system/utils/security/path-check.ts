// securityCheckUtil.ts
import path from 'path';

export interface SecurityCheckOptions {
  projectRoot: string;
  allowedPaths?: string[];
}

/**
 * Performs security checks on a given file path to ensure it is within
 * the allowed project scope and doesn’t target restricted files.
 *
 * @param filePath - The path to be checked.
 * @param options - The security options, including projectRoot and allowedPaths.
 * @throws If the path is outside the project root or is otherwise disallowed.
 */
export function filePathSafetyChecks(
  filePath: string,
  options: SecurityCheckOptions,
) {
  const { projectRoot, allowedPaths } = options;

  const targetPath = path.resolve(projectRoot, filePath);
  const relativePath = path.relative(projectRoot, targetPath);
  // Prevent path traversal attacks
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('Unauthorized file access detected');
  }

  // To do white list check
}
