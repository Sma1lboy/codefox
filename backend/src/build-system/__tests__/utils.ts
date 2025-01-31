import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { BuildSequence } from '../types';
import { BuilderContext } from '../context';
import { BuildMonitor } from '../monitor';

/**
 * Format object to markdown structure
 */
export function objectToMarkdown(obj: any, depth = 1): string {
  if (!obj || typeof obj !== 'object') {
    return String(obj);
  }

  let markdown = '';
  const prefix = '#'.repeat(depth);

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;

    markdown += `${prefix} ${key}\n`;
    if (typeof value === 'object' && !Array.isArray(value)) {
      markdown += objectToMarkdown(value, depth + 1);
    } else if (Array.isArray(value)) {
      markdown +=
        value
          .map((item) => {
            if (typeof item === 'object') {
              return objectToMarkdown(item, depth + 1);
            }
            return String(item);
          })
          .join('\n') + '\n';
    } else {
      markdown += `${value}\n`;
    }
    markdown += '\n';
  }

  return markdown;
}

/**
 * Write content to file
 */
export const writeToFile = (
  rootPath: string,
  handlerName: string,
  data: string | object,
): void => {
  try {
    const sanitizedHandlerName = handlerName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(rootPath, `${sanitizedHandlerName}.md`);
    const formattedContent =
      typeof data === 'object'
        ? JSON.stringify(data, null, 2)
        : String(data).replace(/\\n/g, '\n').replace(/\\t/g, '\t');

    fs.writeFileSync(filePath, formattedContent, 'utf8');
    Logger.log(`Successfully wrote data for ${handlerName} to ${filePath}`);
  } catch (error) {
    Logger.error(`Failed to write data for ${handlerName}:`, error);
    throw error;
  }
};

/**
 * Test result interface
 */
interface TestResult {
  success: boolean;
  logFolderPath: string;
  error?: Error;
  metrics?: any;
}

/**
 * Execute build sequence and record results
 */
export async function executeBuildSequence(
  name: string,
  sequence: BuildSequence,
): Promise<TestResult> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFolderPath = `./logs/${name.toLowerCase().replaceAll(' ', '-')}-${timestamp}`;
  fs.mkdirSync(logFolderPath, { recursive: true });

  const context = new BuilderContext(sequence, 'test-env');
  const monitor = BuildMonitor.getInstance();

  await context.execute();

  return {
    success: true,
    logFolderPath: '',
  };
}
