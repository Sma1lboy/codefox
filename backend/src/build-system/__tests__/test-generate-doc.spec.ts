/* eslint-disable no-console */
import { BuilderContext } from 'src/build-system/context';
import { BuildSequence } from '../types';
import { BuildSequenceExecutor } from '../executor';
import * as fs from 'fs';
import * as path from 'path';

describe('Sequence: PRD -> UXSD -> UXDD -> UXSS', () => {
  // Generate a unique folder with a timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Format timestamp
  const logFolderPath = `./log-${timestamp}`;
  fs.mkdirSync(logFolderPath, { recursive: true }); // Create folder

  // Utility function to write data to individual files
  const writeDataToFile = (handlerName: string, data: any) => {
    const filePath = path.join(logFolderPath, `${handlerName}.txt`);
    const logContent = `${new Date().toISOString()}\n${JSON.stringify(data, null, 2)}\n`;
    fs.writeFileSync(filePath, logContent, 'utf8');
    console.log(`Logged ${handlerName} result data to ${filePath}`);
  };

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
          name: 'Generate UX Sitemap Structure',
          nodes: [
            {
              id: 'op:UXSMS::STATE:GENERATE',
              name: 'UX Sitemap Structure Node',
              type: 'UX',
              subType: 'VIEWS',
              requires: ['op:UXSMD::STATE:GENERATE'],
            },
          ],
        },
      ],
    };

    // Initialize context
    const context = new BuilderContext(sequence, 'test');

    // Set input data in context
    context.setData('projectName', 'spotify like music web');
    context.setData('description', 'user can play music');
    context.setData('platform', 'web');

    // Execute sequence
    try {
      await BuildSequenceExecutor.executeSequence(sequence, context);

      // Write results for each node
      sequence.steps.forEach((step) => {
        step.nodes.forEach((node) => {
          const resultData = context.getResult(node.id);
          if (resultData) {
            writeDataToFile(node.name.replace(/ /g, '_'), resultData);
          }
        });
      });

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
  }, 60000); // Timeout extended for long-running sequence
});
