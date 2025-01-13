import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { generateBackendOverviewPrompt } from './prompt';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import {
  ResponseParsingError,
  MissingConfigurationError,
  ModelTimeoutError,
  TemporaryServiceUnavailableError,
  RateLimitExceededError,
  ModelUnavailableError,
} from 'src/build-system/errors';

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
export class BackendRequirementHandler
  implements BuildHandler<BackendRequirementResult>
{
  readonly id = 'op:BACKEND:REQ';
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

    const dbRequirements = context.getNodeData('op:DATABASE_REQ');
    const datamapDoc = context.getNodeData('op:UX:DATAMAP:DOC');
    const sitemapDoc = context.getNodeData('op:UX:SMD');

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
      backendOverview = await context.model.chatSync({
        model: 'gpt-4o-mini',
        messages: [{ content: overviewPrompt, role: 'system' }],
      });

      if (!backendOverview) {
        throw new ModelTimeoutError(
          'The model did not respond within the expected time.',
        );
      }
      if (backendOverview.trim() === '') {
        throw new ResponseParsingError('Generated backend overview is empty.');
      }
    } catch (error) {
      throw error;
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
