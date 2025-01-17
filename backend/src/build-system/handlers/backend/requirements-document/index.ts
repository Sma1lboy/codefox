import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { generateBackendOverviewPrompt } from './prompt';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import {
  MissingConfigurationError,
  ModelUnavailableError,
} from 'src/build-system/errors';
import { chatSyncWithClocker } from 'src/build-system/utils/handler-helper';
import { BuildNode, BuildNodeRequire } from 'src/build-system/hanlder-manager';
import { DatabaseRequirementHandler } from '../../database/requirements-document';
import { UXDatamapHandler } from '../../ux/datamap';
import { UXSMDHandler } from '../../ux/sitemap-document';

type BackendRequirementResult = {
  overview: string;
  implementation: string;
  config: {
    language: string;
    framework: string;
    packages: Record<string, string>;
  };
};

/**
 * BackendRequirementHandler is responsible for generating the backend requirements document.
 * Core Content Generation: API Endpoints, System Overview
 */

@BuildNode()
@BuildNodeRequire([DatabaseRequirementHandler, UXDatamapHandler, UXSMDHandler])
export class BackendRequirementHandler
  implements BuildHandler<BackendRequirementResult>
{
  private readonly logger: Logger = new Logger('BackendRequirementHandler');

  async run(
    context: BuilderContext,
  ): Promise<BuildResult<BackendRequirementResult>> {
    this.logger.log('Generating Backend Requirements Document...');

    const language = context.getGlobalContext('language') || 'javascript';
    const framework = context.getGlobalContext('framework') || 'express';
    const packages = context.getGlobalContext('packages') || {};
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';

    const dbRequirements = context.getNodeData(DatabaseRequirementHandler);
    const datamapDoc = context.getNodeData(UXDatamapHandler);
    const sitemapDoc = context.getNodeData(UXSMDHandler);

    if (!dbRequirements || !datamapDoc || !sitemapDoc) {
      this.logger.error(
        'Missing required parameters: dbRequirements, datamapDoc, or sitemapDoc',
      );
      throw new MissingConfigurationError(
        'Missing required parameters: dbRequirements, datamapDoc, or sitemapDoc.',
      );
    }

    const overviewPrompt = generateBackendOverviewPrompt(
      projectName,
      dbRequirements,
      datamapDoc,
      sitemapDoc,
      language,
      framework,
      packages,
    );

    let backendOverview: string;

    try {
      backendOverview = await chatSyncWithClocker(
        context,
        {
          model: 'gpt-4o-mini',
          messages: [{ content: overviewPrompt, role: 'system' }],
        },
        'generateBackendOverviewPrompt',
        BackendRequirementHandler.name,
      );
    } catch (error) {
      throw new ModelUnavailableError('Model is unavailable:' + error);
    }

    // Return generated data
    return {
      success: true,
      data: {
        overview: removeCodeBlockFences(backendOverview),
        implementation: '', // Implementation generation skipped
        config: {
          language,
          framework,
          packages,
        },
      },
    };
  }
}
