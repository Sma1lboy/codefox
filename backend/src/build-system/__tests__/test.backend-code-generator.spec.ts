/* eslint-disable no-console */
import { BuilderContext } from 'src/build-system/context';
import { BuildResult, BuildSequence } from '../types';
import { BuildSequenceExecutor } from '../executor';
import * as fs from 'fs';
import * as path from 'path';

describe('Sequence: PRD -> UXSD -> UXDD -> UXSS -> DBSchemas -> BackendCodeGenerator', () => {
  // Generate a unique folder with a timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFolderPath = `./logs/backend_code_generator-${timestamp}`;
  fs.mkdirSync(logFolderPath, { recursive: true });

  /**
   * Utility function to extract content within <GENERATE> tags and write to .md files.
   * @param handlerName - The name of the handler/node.
   * @param data - The data returned by the handler/node.
   */
  const writeMarkdownToFile = (handlerName: string, data: BuildResult) => {
    try {
      // Extract "data" field and ensure it's a string
      const content: string = data?.data;
      if (typeof content !== 'string') {
        throw new Error(`Invalid data format for handler: ${handlerName}`);
      }

      const sanitizedHandlerName = handlerName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filePath = path.join(logFolderPath, `${sanitizedHandlerName}.md`);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Logged ${handlerName} result data to ${filePath}`);
    } catch (error) {
      console.error(`Failed to write markdown for ${handlerName}:`, error);
      throw error;
    }
  };

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
    context.setData('projectName', 'Spotify-like Music Web');
    context.setData('description', 'Users can play music');
    context.setData('platform', 'web');
    context.setData('databaseType', 'SQLite'); // Can be 'PostgreSQL', 'MongoDB', etc., based on your needs

    try {
      // Execute the build sequence
      await BuildSequenceExecutor.executeSequence(sequence, context);

      // Iterate through each step and node to retrieve and log results
      for (const step of sequence.steps) {
        for (const node of step.nodes) {
          const resultData = await context.getResult(node.id);
          console.log(`Result for ${node.name}:`, resultData);

          if (resultData && resultData.success) {
            writeMarkdownToFile(node.name, resultData);
          } else if (resultData && !resultData.success) {
            console.error(
              `Handler ${node.name} failed with error:`,
              resultData.error,
            );
            // Optionally, you can log this to a separate file or handle it as needed
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
