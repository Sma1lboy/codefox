import { isIntegrationTest } from 'src/common/utils';
import { BuildSequence } from '../types';
import { ProjectInitHandler } from '../handlers/project-init';
import { PRDHandler } from '../handlers/product-manager/product-requirements-document/prd';
import { UXSMDHandler } from '../handlers/ux/sitemap-document';
import { DBRequirementHandler } from '../handlers/database/requirements-document';
import { UXDMDHandler } from '../handlers/ux/datamap';
import { BuilderContext } from '../context';
import { DBSchemaHandler } from '../handlers/database/schemas/schemas';
import { BackendRequirementHandler } from '../handlers/backend/requirements-document';
import { BackendCodeHandler } from '../handlers/backend/code-generate';

(isIntegrationTest ? describe : describe.skip)('Build Sequence Test', () => {
  it('should execute build sequence successfully', async () => {
    const sequence: BuildSequence = {
      id: 'test-backend-sequence',
      version: '1.0.0',
      name: 'Wrtie a Cool personal website',
      description:
        'A personal blog website. I am a cybersecurity engineer so i want it to show i am a really cool hacker, with cool terminal functionality',
      databaseType: 'SQLite',
      model: 'gpt-4o-mini',
      projectSize: 'medium', // limit for fun
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
          handler: UXDMDHandler,
          name: 'UX DataMap Document Node',
        },
        {
          handler: DBRequirementHandler,
          name: 'Database Requirements Node',
          // requires: ['op:UX:DATAMAP:DOC'],
        },
        {
          handler: DBSchemaHandler,
          name: 'Database schema Node',
          // requires: ['op:UX:DATAMAP:DOC'],
        },
        {
          handler: BackendRequirementHandler,
          name: 'Backend Requirements Node',
          // requires: ['op:DATABASE_REQ', 'op:UX:DATAMAP:DOC', 'op:UX:SMD'],
        },
        // // {
        // //   handler: BackendFileStructureAndArchitectureHandler,
        // //   name: 'Backend File Structure and Architecture',
        // // },
        {
          handler: BackendCodeHandler,
          name: 'Backend Code Generator Node',
        },
        // {
        //   handler: BackendFileReviewHandler,
        //   name: 'Backend File review Node',
        // },
        // {
        //   handler: FrontendCodeHandler,
        //   name: 'Frontend Code Generator Node',
        // },
      ],
      packages: [],
    };
    const context = new BuilderContext(sequence, 'fullstack-code-gen');
    await context.execute();
  }, 2000000);
});
