import { BuildSequence } from '../types';
import { executeBuildSequence, objectToMarkdown, writeToFile } from './utils';

describe('Build Sequence Test', () => {
  it('should execute build sequence successfully', async () => {
    const sequence: BuildSequence = {
      id: 'test-backend-sequence',
      version: '1.0.0',
      name: 'Spotify-like Music Web',
      description: 'Users can play music',
      databaseType: 'SQLite',
      steps: [
        {
          id: 'step-0',
          name: 'Project Initialization',
          parallel: false,
          nodes: [
            {
              id: 'op:PROJECT::STATE:SETUP',
              name: 'Project Folders Setup',
            },
          ],
        },
        {
          id: 'step-1',
          name: 'Initial Analysis',
          parallel: false,
          nodes: [
            {
              id: 'op:PRD',
              name: 'Project Requirements Document Node',
            },
          ],
        },
        {
          id: 'step-2',
          name: 'UX Base Document Generation',
          parallel: false,
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
          name: 'Parallel UX Processing',
          parallel: true,
          nodes: [
            {
              id: 'op:UX:SMS',
              name: 'UX Sitemap Structure Node',
              requires: ['op:UX:SMD'],
            },
            {
              id: 'op:UX:DATAMAP:DOC',
              name: 'UX DataMap Document Node',
              requires: ['op:UX:SMD'],
            },
          ],
        },
        {
          id: 'step-4',
          name: 'Parallel Project Structure',
          parallel: true,
          nodes: [
            {
              id: 'op:DATABASE_REQ',
              name: 'Database Requirements Node',
              requires: ['op:UX:DATAMAP:DOC'],
            },
            {
              id: 'op:FILE:STRUCT',
              name: 'File Structure Generation',
              requires: ['op:UX:SMD', 'op:UX:DATAMAP:DOC'],
              options: {
                projectPart: 'frontend',
              },
            },
            {
              id: 'op:UX:SMS:LEVEL2',
              name: 'Level 2 UX Sitemap Structure Node details',
              requires: ['op:UX:SMS'],
            },
          ],
        },
        {
          id: 'step-5',
          name: 'Parallel Implementation',
          parallel: true,
          nodes: [
            {
              id: 'op:DATABASE:SCHEMAS',
              name: 'Database Schemas Node',
              requires: ['op:DATABASE_REQ'],
            },
            {
              id: 'op:FILE:ARCH',
              name: 'File Arch',
              requires: ['op:FILE:STRUCT', 'op:UX:DATAMAP:DOC'],
            },
            {
              id: 'op:BACKEND:REQ',
              name: 'Backend Requirements Node',
              requires: ['op:DATABASE_REQ', 'op:UX:DATAMAP:DOC', 'op:UX:SMD'],
            },
          ],
        },
        {
          id: 'step-6',
          name: 'Final Code Generation',
          parallel: false,
          nodes: [
            {
              id: 'op:BACKEND:CODE',
              name: 'Backend Code Generator Node',
              requires: [
                'op:DATABASE:SCHEMAS',
                'op:UX:DATAMAP:DOC',
                'op:BACKEND:REQ',
              ],
            },
          ],
        },
        // TODO: code reviewer
        {
          id: 'step-7',
          name: 'Backend Code Review',
          parallel: false,
          nodes: [
            {
              id: 'op:BACKEND:FILE:REVIEW',
              name: 'Backend File Review Node',
              requires: ['op:BACKEND:CODE', 'op:BACKEND:REQ'],
            },
          ],
        },
      ],
    };

    const result = await executeBuildSequence('fullstack-code-gen', sequence);
    expect(result.success).toBe(true);
    expect(result.metrics).toBeDefined();
    console.log(`Logs saved to: ${result.logFolderPath}`);
  }, 300000);
});