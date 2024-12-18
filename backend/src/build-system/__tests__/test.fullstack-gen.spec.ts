/* eslint-disable no-console */
import { BuilderContext } from 'src/build-system/context';
import { BuildSequence } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { writeToFile } from './utils';
import { BuildMonitor } from '../monitor';
import { Logger } from '@nestjs/common';

describe('Sequence: PRD -> UXSD -> UXSS -> UXDD -> DATABASE_REQ -> DBSchemas -> Frontend_File_struct -> Frontend_File_arch -> BackendCodeGenerator', () => {
  // Generate a unique folder with a timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFolderPath = `./logs/Fullstack_code_generator-${timestamp}`;
  fs.mkdirSync(logFolderPath, { recursive: true });

  it('should execute the frontend and backend code generation sequence and log results to individual files', async () => {
    // Define the build sequence up to Backend Code Generator
    const sequence: BuildSequence = {
      id: 'test-backend-sequence',
      version: '1.0.0',
      name: 'Spotify-like Music Web',
      description: 'Users can play music',
      databaseType: 'SQLite',
      steps: [
        {
          id: 'step-1',
          name: 'Generate PRD',
          nodes: [
            {
              id: 'op:PRD',
              name: 'PRD Generation Node',
              type: 'ANALYSIS',
              subType: 'PRD',
            },
          ],
        },
        {
          id: 'step-2',
          name: 'Generate UX Sitemap Document',
          nodes: [
            {
              id: 'op:UX:SMD',
              name: 'UX Sitemap Document Node',
              type: 'UX',
              subType: 'SITEMAP',
              requires: ['op:PRD'],
            },
          ],
        },
        {
          id: 'step-4',
          name: 'Generate UX Sitemap Structure',
          nodes: [
            {
              id: 'op:UX:SMS',
              name: 'UX Sitemap Structure Node',
              type: 'UX',
              subType: 'VIEWS',
              requires: ['op:UX:SMD'],
            },
          ],
        },
        {
          id: 'step-5',
          name: 'Generate UX Data Map Document',
          nodes: [
            {
              id: 'op:UX:DATAMAP:DOC',
              name: 'UX Data Map Document Node',
              type: 'UX',
              subType: 'DATAMAP',
              requires: ['op:UX:SMD'],
            },
          ],
        },
        {
          id: 'step-6',
          name: 'Generate Database Requirements',
          nodes: [
            {
              id: 'op:DATABASE_REQ',
              name: 'Database Requirements Node',
              type: 'DATABASE',
              subType: 'SCHEMAS',
              requires: ['op:UX:DATAMAP:DOC'],
            },
          ],
        },
        {
          id: 'step-7',
          name: 'Generate Database Schemas',
          nodes: [
            {
              id: 'op:DATABASE:SCHEMAS',
              name: 'Database Schemas Node',
              type: 'DATABASE',
              subType: 'SCHEMAS',
              requires: ['op:DATABASE_REQ'],
            },
          ],
        },
        {
          id: 'step-8',
          name: 'file structure generation',
          nodes: [
            {
              id: 'op:FILE:STRUCT',
              name: 'file structure generation',
              requires: ['op:UX:SMD', 'op:UX:DATAMAP:DOC'],
              options: {
                projectPart: 'frontend',
              },
            },
          ],
        },
        {
          id: 'step-9',
          name: 'File_Arch Document',
          nodes: [
            {
              id: 'op:FILE:ARCH',
              name: 'File_Arch',
              requires: ['op:FILE:STRUCT', 'op:UX:DATAMAP:DOC'],
            },
          ],
        },
        {
          id: 'step-10',
          name: 'Generate Backend Code',
          nodes: [
            {
              id: 'op:BACKEND:CODE',
              name: 'Backend Code Generator Node',
              type: 'BACKEND',
              requires: ['op:DATABASE:SCHEMAS', 'op:UX:DATAMAP:DOC'],
            },
          ],
        },
      ],
    };

    // Initialize the BuilderContext with the defined sequence and environment
    const context = new BuilderContext(sequence, 'test-env');
    const monitor = BuildMonitor.getInstance();

    try {
      console.log('Starting sequence execution...');
      console.time('Total Execution Time');

      // Execute the build sequence
      await context.execute();

      console.timeEnd('Total Execution Time');

      const monitorReport = monitor.generateTextReport(sequence.id);
      fs.writeFileSync(
        path.join(logFolderPath, 'execution-metrics.txt'),
        monitorReport,
        'utf8',
      );
      console.log('\nExecution Metrics Report:');
      console.log(monitorReport);

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

        console.log('\nSequence Metrics:');
        console.table(metricsJson);
      }

      console.log('\nProcessing individual node results and metrics...');
      for (const step of sequence.steps) {
        const stepMetrics = sequenceMetrics?.stepMetrics.get(step.id);
        console.log(`\nStep: ${step.name} (${step.id})`);
        console.log(`Duration: ${stepMetrics?.duration}ms`);
        console.log(
          `Completed Nodes: ${stepMetrics?.completedNodes}/${stepMetrics?.totalNodes}`,
        );

        for (const node of step.nodes) {
          const resultData = await context.getNodeData(node.id);
          const nodeMetrics = stepMetrics?.nodeMetrics.get(node.id);
          if (resultData) {
            writeToFile(logFolderPath, `${node.name}`, resultData);
          } else {
            console.error(
              `  Error: Handler ${node.name} failed to produce result data`,
            );
            writeToFile(logFolderPath, `${node.name}-error`, {
              error: 'No result data',
              metrics: nodeMetrics,
            });
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

      console.log('\nExecution Summary:');
      console.table(summary);

      console.log('\nDetailed logs and metrics stored in:', logFolderPath);
    } catch (error) {
      console.timeEnd('Total Execution Time');

      // 保存错误信息和当前的执行状态
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

      console.error('\nError during sequence execution:');
      console.error(error);
      console.error(
        '\nError report saved to:',
        path.join(logFolderPath, 'error-with-metrics.json'),
      );
      throw new Error('Sequence execution failed.');
    }
  }, 600000); // Timeout set to 10 minutes
});
