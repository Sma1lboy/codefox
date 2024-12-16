/* eslint-disable no-console */
import { BuilderContext } from 'src/build-system/context';
import { BuildSequence } from '../types';
import { BuildSequenceExecutor } from '../executor';
import * as fs from 'fs';
import * as path from 'path';
import { writeToFile } from './utils';

describe('Sequence: PRD -> UXSD -> UXDD -> UXSS -> DBSchemas -> BackendCodeGenerator', () => {
  // Generate a unique folder with a timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFolderPath = `./logs/backend_code_generator-${timestamp}`;
  fs.mkdirSync(logFolderPath, { recursive: true });

  it('should execute the backend code generation sequence and log results to individual files', async () => {
    // Define the build sequence up to Backend Code Generator
    const sequence: BuildSequence = {
      id: 'test-backend-sequence',
      version: '1.0.0',
      name: 'Test PRD to Backend Code Generation Sequence',
      description:
        'Testing sequence execution from PRD to Backend Code Generation',
      steps: [
        {
          id: 'step-1',
          name: 'Generate PRD',
          nodes: [
            {
              id: 'op:PRD::STATE:GENERATE',
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
              id: 'op:UXSMD::STATE:GENERATE',
              name: 'UX Sitemap Document Node',
              type: 'UX',
              subType: 'SITEMAP',
              requires: ['op:PRD::STATE:GENERATE'],
            },
          ],
        },
        {
          id: 'step-3',
          name: 'Generate UX Data Map Document',
          nodes: [
            {
              id: 'op:UX_DATAMAP::STATE:GENERATE',
              name: 'UX Data Map Document Node',
              type: 'UX',
              subType: 'DATAMAP',
              requires: ['op:UXSMD::STATE:GENERATE'],
            },
          ],
        },
        {
          id: 'step-4',
          name: 'Generate Database Requirements',
          nodes: [
            {
              id: 'op:DATABASE_REQ::STATE:GENERATE',
              name: 'Database Requirements Node',
              type: 'DATABASE',
              subType: 'SCHEMAS',
              requires: ['op:UX_DATAMAP::STATE:GENERATE'],
            },
          ],
        },
        {
          id: 'step-5',
          name: 'Generate Database Schemas',
          nodes: [
            {
              id: 'op:DATABASE:SCHEMAS',
              name: 'Database Schemas Node',
              type: 'DATABASE',
              subType: 'SCHEMAS',
              requires: ['op:DATABASE_REQ::STATE:GENERATE'],
            },
          ],
        },
        {
          id: 'step-6',
          name: 'Generate Backend Code',
          nodes: [
            {
              id: 'op:BACKEND_CODE::STATE:GENERATE',
              name: 'Backend Code Generator Node',
              type: 'BACKEND',
              requires: [
                'op:DATABASE:SCHEMAS',
                'op:UX_DATAMAP::STATE:GENERATE',
              ],
            },
          ],
        },
      ],
    };

    // Initialize the BuilderContext with the defined sequence and environment
    const context = new BuilderContext(sequence, 'test-env');

    // Set input data for context
    context.setGlobalContext('projectName', 'Spotify-like Music Web');
    context.setGlobalContext('description', 'Users can play music');
    context.setGlobalContext('platform', 'web');
    context.setGlobalContext('databaseType', 'SQLite'); // Can be 'PostgreSQL', 'MongoDB', etc., based on your needs

    try {
      // Execute the build sequence
      await BuildSequenceExecutor.executeSequence(sequence, context);

      // Iterate through each step and node to retrieve and log results
      for (const step of sequence.steps) {
        for (const node of step.nodes) {
          const resultData = await context.getNodeData(node.id);
          console.log(`Result for ${node.name}:`, resultData);

          if (resultData) {
            writeToFile(logFolderPath, node.name, resultData);
          } else {
            console.error(
              `Handler ${node.name} failed with error:`,
              resultData.error,
            );
          }
        }
      }

      console.log(
        'Sequence executed successfully. Logs stored in:',
        logFolderPath,
      );
    } catch (error) {
      console.error('Error during sequence execution:', error);
      fs.writeFileSync(
        path.join(logFolderPath, 'error.txt'),
        `Error: ${error.message}\n${error.stack}`,
        'utf8',
      );
      throw new Error('Sequence execution failed.');
    }
  }, 600000); // Timeout set to 10 minutes
});
