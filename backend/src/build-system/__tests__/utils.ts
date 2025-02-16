import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { BuildSequence, BuildHandlerConstructor } from '../types';
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
        totalNodes: sequenceMetrics.totalNodes,
        completedNodes: sequenceMetrics.completedNodes,
        failedNodes: sequenceMetrics.failedNodes,
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

    // Log node results
    for (const node of sequence.nodes) {
      const handlerClass = node.handler as BuildHandlerConstructor;
      const resultData = context.getNodeData(handlerClass);
      const nodeMetrics = sequenceMetrics?.nodeMetrics.get(handlerClass.name);

      if (resultData) {
        const content =
          typeof resultData === 'object'
            ? objectToMarkdown(resultData)
            : resultData;
        writeToFile(logFolderPath, node.name || handlerClass.name, content);
      } else {
        Logger.error(
          `Error: Handler ${node.name || handlerClass.name} failed to produce result data`,
        );
        writeToFile(
          logFolderPath,
          `${node.name || handlerClass.name}-error`,
          objectToMarkdown({
            error: 'No result data',
            metrics: nodeMetrics,
          }),
        );
      }
    }

    const summary = {
      timestamp: new Date().toISOString(),
      sequenceId: sequence.id,
      sequenceName: sequence.name,
      totalExecutionTime: `${sequenceMetrics?.duration}ms`,
      successRate: `${sequenceMetrics?.successRate.toFixed(2)}%`,
      totalNodes: sequenceMetrics?.totalNodes,
      completedNodes: sequenceMetrics?.completedNodes,
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
