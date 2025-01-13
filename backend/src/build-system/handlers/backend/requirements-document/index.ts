import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import {
  generateBackendImplementationPrompt,
  generateBackendOverviewPrompt,
} from './prompt';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import {
  NonRetryableError,
  RetryableError,
} from 'src/build-system/retry-handler';

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
  readonly logger: Logger = new Logger('BackendRequirementHandler');

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
      return {
        success: false,
        error: new NonRetryableError(
          'Missing required parameters: dbRequirements, datamapDoc, or sitemapDoc.',
        ),
      };
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

      if (!backendOverview || backendOverview.trim() === '') {
        throw new RetryableError('Generated backend overview is empty.');
      }
    } catch (error) {
      if (error instanceof RetryableError) {
        this.logger.warn(
          `Retryable error during backend overview generation: ${error.message}`,
        );
        return {
          success: false,
          error,
        };
      }

      this.logger.error(
        'Non-retryable error generating backend overview:',
        error,
      );
      return {
        success: false,
        error: new NonRetryableError('Failed to generate backend overview.'),
      };
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
