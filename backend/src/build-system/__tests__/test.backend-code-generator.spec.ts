/* eslint-disable no-console */
import { BuilderContext } from 'src/build-system/context';
import { BuildSequence } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { writeToFile } from './utils';
import { isIntegrationTest } from 'src/common/utils';
import { Logger } from '@nestjs/common';

(isIntegrationTest ? describe : describe.skip)(
  'Sequence: PRD -> UXSD -> UXDD -> UXSS -> DBSchemas -> BackendCodeGenerator',
  () => {
    // Generate a unique folder with a timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFolderPath = `./logs/backend_code_generator-${timestamp}`;
    fs.mkdirSync(logFolderPath, { recursive: true });

    (isIntegrationTest ? it : it.skip)(
      'should execute the backend code generation sequence and log results to individual files',
      async () => {
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
                  requires: ['op:PRD'],
                },
              ],
            },
            {
              id: 'step-3',
              name: 'Generate UX Data Map Document',
              nodes: [
                {
                  id: 'op:UX:DATAMAP:DOC',
                  name: 'UX Data Map Document Node',
                  requires: ['op:UX:SMD'],
                },
              ],
            },
            {
              id: 'step-4',
              name: 'Generate Database Requirements',
              nodes: [
                {
                  id: 'op:DATABASE_REQ',
                  name: 'Database Requirements Node',
                  requires: ['op:UX:DATAMAP:DOC'],
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
                  requires: ['op:DATABASE_REQ'],
                },
              ],
            },
            {
              id: 'step-6',
              name: 'Generate Backend Code',
              nodes: [
                {
                  id: 'op:BACKEND:CODE',
                  name: 'Backend Code Generator Node',
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
          await context.execute();

          // Iterate through each step and node to retrieve and log results
          for (const step of sequence.steps) {
            for (const node of step.nodes) {
              const resultData = await context.getNodeData(node.id);
              Logger.log(`Result for ${node.name}:`, resultData);

              if (resultData) {
                writeToFile(logFolderPath, node.name, resultData);
              } else {
                Logger.error(
                  `Handler ${node.name} failed with error:`,
                  resultData.error,
                );
              }
            }
          }

          Logger.log(
            'Sequence executed successfully. Logs stored in:',
            logFolderPath,
          );
        } catch (error) {
          Logger.error('Error during sequence execution:', error);
          fs.writeFileSync(
            path.join(logFolderPath, 'error.txt'),
            `Error: ${error.message}\n${error.stack}`,
            'utf8',
          );
          throw new Error('Sequence execution failed.');
        }
      },
      600000,
    ); // Timeout set to 10 minutes
  },
);
