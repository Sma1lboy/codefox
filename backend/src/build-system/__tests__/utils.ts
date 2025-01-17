import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { BuildSequence } from '../types';
import { BuilderContext } from '../context';
import { BuildMonitor } from '../monitor';
/**
 * Utility function to write content to a file in a clean, formatted manner.
 * @param handlerName - The name of the handler.
 * @param data - The data to be written to the file.
 */
export const writeToFile = (
  rootPath: string,
  handlerName: string,
  data: string | object,
): void => {
  try {
    // Sanitize handler name to prevent illegal file names
    const sanitizedHandlerName = handlerName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(rootPath, `${sanitizedHandlerName}.md`);

    // Generate clean and readable content
    const formattedContent = formatContent(data);

    // Write the formatted content to the file
    fs.writeFileSync(filePath, formattedContent, 'utf8');
    Logger.log(`Successfully wrote data for ${handlerName} to ${filePath}`);
  } catch (error) {
    Logger.error(`Failed to write data for ${handlerName}:`, error);
    throw error;
  }
};

/**
 * Formats the content for writing to the file.
 * @param data - The content to format (either a string or an object).
 * @returns A formatted string.
 */
export const formatContent = (data: string | object): string => {
  if (typeof data === 'string') {
    // Remove unnecessary escape characters and normalize newlines
    return data
      .replace(/\\n/g, '\n') // Handle escaped newlines
      .replace(/\\t/g, '\t'); // Handle escaped tabs
  } else if (typeof data === 'object') {
    // Pretty-print JSON objects with 2-space indentation
    return JSON.stringify(data, null, 2);
  } else {
    // Convert other types to strings
    return String(data);
  }
};

export function objectToMarkdown(obj: any, depth = 1): string {
  if (!obj || typeof obj !== 'object') {
    return String(obj);
  }

  let markdown = '';
  const prefix = '#'.repeat(depth);

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      continue;
    }

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

interface TestResult {
  success: boolean;
  logFolderPath: string;
  error?: Error;
  metrics?: any;
}

export async function executeBuildSequence(
  name: string,
  sequence: BuildSequence,
): Promise<TestResult> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFolderPath = `./logs/${name.toLocaleLowerCase().replaceAll(' ', '-')}-${timestamp}`;
  fs.mkdirSync(logFolderPath, { recursive: true });

  const context = new BuilderContext(sequence, 'test-env');
  const monitor = BuildMonitor.getInstance();

  try {
    console.time('Total Execution Time');
    await context.execute();
    console.timeEnd('Total Execution Time');

    const monitorReport = monitor.generateTextReport(sequence.id);
    fs.writeFileSync(
      path.join(logFolderPath, 'execution-metrics.txt'),
      monitorReport,
      'utf8',
    );

    const sequenceMetrics = monitor.getSequenceMetrics(sequence.id);
    if (sequenceMetrics) {
      const metricsJson = {
        totalDuration: `${sequenceMetrics.duration}ms`,
        successRate: `${sequenceMetrics.successRate.toFixed(2)}%`,
        totalSteps: sequenceMetrics.totalSteps,
        completedSteps: sequenceMetrics.completedSteps,
        failedSteps: sequenceMetrics.failedSteps,
        totalNodes: sequenceMetrics.totalNodes,
        startTime: new Date(sequenceMetrics.startTime).toISOString(),
        endTime: new Date(sequenceMetrics.endTime).toISOString(),
      };

      fs.writeFileSync(
        path.join(logFolderPath, 'metrics.json'),
        JSON.stringify(metricsJson, null, 2),
        'utf8',
      );

      Logger.log('\nSequence Metrics:');
      console.table(metricsJson);
    }

    for (const step of sequence.steps) {
      const stepMetrics = sequenceMetrics?.stepMetrics.get(step.id);
      for (const node of step.nodes) {
        const resultData = await context.getNodeData(node.id);
        const nodeMetrics = stepMetrics?.nodeMetrics.get(node.id);

        if (resultData) {
          const content =
            typeof resultData === 'object'
              ? objectToMarkdown(resultData)
              : resultData;
          writeToFile(logFolderPath, `${node.name}`, content);
        } else {
          Logger.error(
            `Error: Handler ${node.name} failed to produce result data`,
          );
          writeToFile(
            logFolderPath,
            `${node.name}-error`,
            objectToMarkdown({
              error: 'No result data',
              metrics: nodeMetrics,
            }),
          );
        }
      }
    }

    const summary = {
      timestamp: new Date().toISOString(),
      sequenceId: sequence.id,
      sequenceName: sequence.name,
      totalExecutionTime: `${sequenceMetrics?.duration}ms`,
      successRate: `${sequenceMetrics?.successRate.toFixed(2)}%`,
      nodesExecuted: sequenceMetrics?.totalNodes,
      completedNodes: sequenceMetrics?.stepMetrics.size,
      logFolder: logFolderPath,
    };

    fs.writeFileSync(
      path.join(logFolderPath, 'execution-summary.json'),
      JSON.stringify(summary, null, 2),
      'utf8',
    );

    return {
      success: true,
      logFolderPath,
      metrics: sequenceMetrics,
    };
  } catch (error) {
    const errorReport = {
      error: {
        message: error.message,
        stack: error.stack,
      },
      metrics: monitor.getSequenceMetrics(sequence.id),
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(logFolderPath, 'error-with-metrics.json'),
      JSON.stringify(errorReport, null, 2),
      'utf8',
    );

    Logger.error('\nError during sequence execution:');
    Logger.error(error);

    return {
      success: false,
      logFolderPath,
      error: error as Error,
      metrics: monitor.getSequenceMetrics(sequence.id),
    };
  }
}
