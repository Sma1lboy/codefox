/* eslint-disable no-console */
import { BuilderContext } from 'src/build-system/context';
import { BuildSequence } from '../types';
import { BuildSequenceExecutor } from '../executor';
import * as fs from 'fs';
import * as path from 'path';
import { writeToFile } from './utils';

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
              requires: [
                'op:FILE:STRUCT',
                //TODO: here use datamap doc rather than datamap struct, we have to change this
                'op:UX:DATAMAP:DOC',
              ],
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
