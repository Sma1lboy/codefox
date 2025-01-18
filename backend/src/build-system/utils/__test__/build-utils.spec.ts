import { BuildSequence } from 'src/build-system/types';
import { Logger } from '@nestjs/common';
import { ProjectInitHandler } from 'src/build-system/handlers/project-init';
import { PRDHandler } from 'src/build-system/handlers/product-manager/product-requirements-document/prd';
import { UXSMDHandler } from 'src/build-system/handlers/ux/sitemap-document';
import { UXSitemapStructureHandler } from 'src/build-system/handlers/ux/sitemap-structure';
import { UXDatamapHandler } from 'src/build-system/handlers/ux/datamap';
import { DatabaseRequirementHandler } from 'src/build-system/handlers/database/requirements-document';
import { FileStructureHandler } from 'src/build-system/handlers/file-manager/file-structure';
import { UXSitemapStructurePagebyPageHandler } from 'src/build-system/handlers/ux/sitemap-structure/sms-page';
import { DBSchemaHandler } from 'src/build-system/handlers/database/schemas/schemas';
import { FileArchGenerateHandler } from 'src/build-system/handlers/file-manager/file-arch';
import { BackendRequirementHandler } from 'src/build-system/handlers/backend/requirements-document';
import { BackendCodeHandler } from 'src/build-system/handlers/backend/code-generate';
import { BackendFileReviewHandler } from 'src/build-system/handlers/backend/file-review/file-review';
import { sortBuildSequence } from '../build-utils';

const logger = new Logger('BuildUtilsTest');

describe('Build Sequence Test', () => {
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
          handler: UXSitemapStructureHandler,
          name: 'UX Sitemap Structure Node',
        },
        {
          handler: UXDatamapHandler,
          name: 'UX DataMap Document Node',
        },
        {
          handler: DatabaseRequirementHandler,
          name: 'Database Requirements Node',
        },
        {
          handler: FileStructureHandler,
          name: 'File Structure Generation',
          options: {
            projectPart: 'frontend',
          },
        },
        {
          handler: UXSitemapStructurePagebyPageHandler,
          name: 'Level 2 UX Sitemap Structure Node details',
        },
        {
          handler: DBSchemaHandler,
          name: 'Database Schemas Node',
        },
        {
          handler: FileArchGenerateHandler,
          name: 'File Arch',
        },
        {
          handler: BackendRequirementHandler,
          name: 'Backend Requirements Node',
        },
        {
          handler: BackendCodeHandler,
          name: 'Backend Code Generator Node',
        },
        {
          handler: BackendFileReviewHandler,
          name: 'Backend File Review Node',
        },
      ],
    };

    logger.log('Before Sorting:');
    sequence.nodes.forEach((node, index) => {
      logger.log(`${index + 1}: ${node.name}`);
    });

    const sortedNodes = sortBuildSequence(sequence);

    logger.log('\nAfter Sorting:');
    sortedNodes.forEach((node, index) => {
      logger.log(`${index + 1}: ${node.name}`);
    });

    logger.log('\nBefore/After Comparison (Same Index):');
    sequence.nodes.forEach((node, index) => {
      const sortedNode = sortedNodes[index];
      logger.log(`Index ${index + 1}:`);
      logger.log(`  Before: ${node.name}`);
      logger.log(`  After:  ${sortedNode.name}`);
    });
  }, 300000);
});

describe('sortBuildSequence Tests', () => {
  it('should sort build sequence correctly based on dependencies', () => {
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
          description: 'Create project folders',
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
          handler: UXSitemapStructureHandler,
          name: 'UX Sitemap Structure Node',
        },
        {
          handler: UXDatamapHandler,
          name: 'UX DataMap Document Node',
        },
        {
          handler: UXSitemapStructurePagebyPageHandler,
          name: 'Level 2 UX Sitemap Structure Node details',
        },
      ],
    };

    logger.log('Before Sorting:');
    sequence.nodes.forEach((node, index) => {
      logger.log(`${index + 1}: ${node.name}`);
    });

    const sortedNodes = sortBuildSequence(sequence);

    logger.log('\nAfter Sorting:');
    sortedNodes.forEach((node, index) => {
      logger.log(`${index + 1}: ${node.name}`);
    });

    logger.log('\nBefore/After Comparison (Same Index):');
    sequence.nodes.forEach((node, index) => {
      const sortedNode = sortedNodes[index];
      logger.log(`Index ${index + 1}:`);
      logger.log(`  Before: ${node.name}`);
      logger.log(`  After:  ${sortedNode.name}`);
    });
  });
});
