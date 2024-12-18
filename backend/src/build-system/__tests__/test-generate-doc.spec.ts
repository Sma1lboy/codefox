/* eslint-disable no-console */
import { BuilderContext } from 'src/build-system/context';
import { BuildSequence } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { writeToFile } from './utils';

describe('Sequence: PRD -> UXSD -> UXDD -> UXSS', () => {
  // Generate a unique folder with a timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFolderPath = `./logs/generate-docs-${timestamp}`;
  fs.mkdirSync(logFolderPath, { recursive: true });

  it('should execute the full sequence and log results to individual files', async () => {
    const sequence: BuildSequence = {
      id: 'test-sequence',
      version: '1.0.0',
      name: 'Test PRD to UX Sequence',
      description: 'Testing PRD to UX sequence execution',
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
          name: 'Generate UX Sitemap Structure',
          nodes: [
            {
              id: 'op:UX:SMS',
              name: 'UX Sitemap Structure Node',
              requires: ['op:UX:SMD'],
            },
          ],
        },
        {
          id: 'step-4',
          name: 'UX Data Map Document',
          nodes: [
            {
              id: 'op:UX:DATAMAP:DOC',
              name: 'UX Data Map Document node',
              requires: ['op:UX:SMD'],
            },
          ],
        },
        {
          id: 'step-5',
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
          id: 'step-6',
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
      ],
    };

    const context = new BuilderContext(sequence, 'test');

    // Set input data for context
    context.setGlobalContext('projectName', 'spotify like music web');
    context.setGlobalContext('description', 'user can play music');
    context.setGlobalContext('platform', 'web');

    try {
      await context.execute();

      for (const step of sequence.steps) {
        for (const node of step.nodes) {
          const resultData = await context.getNodeData(node.id);
          console.log(resultData);
          if (resultData) {
            writeToFile(logFolderPath, node.id, resultData);
          }
        }
      }

      console.log(
        'Sequence completed successfully. Logs stored in:',
        logFolderPath,
      );
    } catch (error) {
      console.error('Error during sequence execution:', error);
      fs.writeFileSync(
        path.join(logFolderPath, 'error.txt'),
        `Error: ${error.message}\n${error.stack}`,
        'utf8',
      );
      throw error;
    }
  }, 600000);
});
