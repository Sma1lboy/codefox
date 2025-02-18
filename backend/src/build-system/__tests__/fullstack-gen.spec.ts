import { isIntegrationTest } from 'src/common/utils';
import { BuildSequence } from '../types';
import { ProjectInitHandler } from '../handlers/project-init';
import { PRDHandler } from '../handlers/product-manager/product-requirements-document/prd';
import { UXSMDHandler } from '../handlers/ux/sitemap-document';
import { UXSMSHandler } from '../handlers/ux/sitemap-structure';
import { DBRequirementHandler } from '../handlers/database/requirements-document';
import { FileStructureHandler } from '../handlers/file-manager/file-structure';
import { UXSMSPageByPageHandler } from '../handlers/ux/sitemap-structure/sms-page';
import { DBSchemaHandler } from '../handlers/database/schemas/schemas';
import { FileFAHandler } from '../handlers/file-manager/file-arch';
import { BackendRequirementHandler } from '../handlers/backend/requirements-document';
import { BackendCodeHandler } from '../handlers/backend/code-generate';
import { BackendFileReviewHandler } from '../handlers/backend/file-review/file-review';
import { UXDMDHandler } from '../handlers/ux/datamap';
import { BuilderContext } from '../context';
import { FrontendCodeHandler } from '../handlers/frontend-code-generate';

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
          handler: ProjectInitHandler,
          name: 'Project Folders Setup',
        },
        {
          handler: PRDHandler,
          name: 'Project Requirements Document Node',
        },
        {
          handler: UXSMDHandler,
          name: 'UX Sitemap Document Node',
        },
        {
          handler: UXSMSHandler,
          name: 'UX Sitemap Structure Node',
          // requires: ['op:UX:SMD'],
        },
        {
          handler: UXDMDHandler,
          name: 'UX DataMap Document Node',
        },
        {
          handler: DBRequirementHandler,
          name: 'Database Requirements Node',
          // requires: ['op:UX:DATAMAP:DOC'],
        },
        {
          handler: FileStructureHandler,
          name: 'File Structure Generation',
          // requires: ['op:UX:SMD', 'op:UX:DATAMAP:DOC'],
          options: {
            projectPart: 'frontend',
          },
        },
        {
          handler: UXSMSPageByPageHandler,
          name: 'Level 2 UX Sitemap Structure Node details',
          // requires: ['op:UX:SMS'],
        },
        {
          handler: DBSchemaHandler,
          name: 'Database Schemas Node',
          // requires: ['op:DATABASE_REQ'],
        },
        {
          handler: FileFAHandler,
          name: 'File Arch',
          // requires: ['op:FILE:STRUCT', 'op:UX:DATAMAP:DOC'],
        },
        {
          handler: BackendRequirementHandler,
          name: 'Backend Requirements Node',
          // requires: ['op:DATABASE_REQ', 'op:UX:DATAMAP:DOC', 'op:UX:SMD'],
        },
        {
          handler: BackendCodeHandler,
          name: 'Backend Code Generator Node',
        },
        {
          handler: BackendFileReviewHandler,
          name: 'Backend File Review Node',
        },
        {
          handler: FrontendCodeHandler,
          name: 'Frontend Code Generator Node',
        },
      ],
      packages: [],
    };
    const context = new BuilderContext(sequence, 'fullstack-code-gen');
    await context.execute();
  }, 300000);
});
