import { isIntegrationTest } from 'src/common/utils';
import { BuildSequence } from '../types';
import { executeBuildSequence } from './utils';
import { Logger } from '@nestjs/common';
(isIntegrationTest ? describe : describe.skip)('Build Sequence Test', () => {
  it('should execute build sequence successfully', async () => {
    const sequence: BuildSequence = {
      id: 'test-backend-sequence',
      version: '1.0.0',
      name: 'Spotify-like Music Web',
      description: 'Users can play music',
      databaseType: 'SQLite',
      nodes: [
        {
          id: 'op:PROJECT::STATE:SETUP',
          name: 'Project Folders Setup',
        },
        {
          id: 'op:PRD',
          name: 'Project Requirements Document Node',
        },
        {
          id: 'op:UX:SMD',
          name: 'UX Sitemap Document Node',
          requires: ['op:PRD'],
        },
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
        {
          id: 'op:BACKEND:CODE',
          name: 'Backend Code Generator Node',
          requires: [
            'op:DATABASE:SCHEMAS',
            'op:UX:DATAMAP:DOC',
            'op:BACKEND:REQ',
          ],
        },
        {
          id: 'op:FRONTEND:CODE',
          name: 'Frontend Code Generator Node',
        },
        {
          id: 'op:BACKEND:FILE:REVIEW',
          name: 'Backend File Review Node',
          requires: ['op:BACKEND:CODE', 'op:BACKEND:REQ'],
        },
      ],
    };

    const result = await executeBuildSequence('fullstack-code-gen', sequence);
    expect(result.success).toBe(true);
    expect(result.metrics).toBeDefined();
    Logger.log(`Logs saved to: ${result.logFolderPath}`);
  }, 300000);
});
