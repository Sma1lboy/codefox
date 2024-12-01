/* eslint-disable no-console */
import { BuilderContext } from 'src/build-system/context';
import { BuildSequence } from '../types';
import { BuildSequenceExecutor } from '../executor';
import * as fs from 'fs';
import * as path from 'path';

describe('Sequence: PRD -> UXSD -> UXDD -> UXSS', () => {
  // Generate a unique folder with a timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFolderPath = `./log-${timestamp}`;
  fs.mkdirSync(logFolderPath, { recursive: true });

  // Utility function to extract Markdown content and write to .md files
  const writeMarkdownToFile = (handlerName: string, data: any) => {
    // Extract "data" field and remove surrounding Markdown code block formatting
    const markdownContent = data?.data?.replace(/```/g, '') || '';
    const filePath = path.join(logFolderPath, `${handlerName}.md`);
    fs.writeFileSync(filePath, markdownContent, 'utf8');
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
        {
          id: 'step-4',
          name: 'UX Data Map Document',
          nodes: [
            {
              id: 'op:UX_DATAMAP::STATE:GENERATE',
              name: 'UX Data Map Document node',
              requires: ['op:UXSMD::STATE:GENERATE'],
            },
          ],
        },
        {
          id: 'step-5',
          name: 'file structure generation',
          nodes: [
            {
              id: 'op:FSTRUCT::STATE:GENERATE',
              name: 'file structure generation',
              requires: [
                'op:UXSMD::STATE:GENERATE',
                'op:UX_DATAMAP::STATE:GENERATE',
              ],
            },
          ],
        },
        {
          id: 'step-6',
          name: 'File_Arch Document',
          nodes: [
            {
              id: 'op:FILE_ARCH::STATE:GENERATE',
              name: 'File_Arch',
              requires: [
                'op:FSTRUCT::STATE:GENERATE',
                'op:UX_DATAMAP::STATE:GENERATE',
              ],
            },
          ],
        },
      ],
    };

    const context = new BuilderContext(sequence, 'test');

    // Set input data for context
    context.setData('projectName', 'spotify like music web');
    context.setData('description', 'user can play music');
    context.setData('platform', 'web');

    try {
      await BuildSequenceExecutor.executeSequence(sequence, context);

      for (const step of sequence.steps) {
        for (const node of step.nodes) {
          const resultData = await context.getResult(node.id);
          console.log(resultData);
          if (resultData) {
            writeMarkdownToFile(node.name.replace(/ /g, '_'), resultData);
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
