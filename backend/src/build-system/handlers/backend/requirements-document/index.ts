import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import {
  generateBackendImplementationPrompt,
  generateBackendOverviewPrompt,
} from './prompt';
import { Logger } from '@nestjs/common';

type BackendRequirementResult = {
  overview: string;
  implementation: string;
  config: {
    language: string;
    framework: string;
    packages: Record<string, string>;
  };
};

export class BackendRequirementHandler
  implements BuildHandler<BackendRequirementResult>
{
  readonly id = 'op:BACKEND:REQ';
  readonly logger: Logger = new Logger('BackendRequirementHandler');

  async run(
    context: BuilderContext,
  ): Promise<BuildResult<BackendRequirementResult>> {
    this.logger.log('Generating Backend Requirements Document...');

    // Retrieve backend configuration from context
    const language = context.getGlobalContext('language') || 'javascript';
    const framework = context.getGlobalContext('framework') || 'express';
    const packages = context.getGlobalContext('packages') || {};

    const dbRequirements = context.getNodeData('op:DATABASE_REQ');

    // Generate backend overview
    const overviewPrompt = generateBackendOverviewPrompt(
      context.getGlobalContext('projectName') || 'Default Project Name',
      dbRequirements,
      language,
      framework,
      packages,
    );

    let backendOverview: string;
    try {
      backendOverview = await context.model.chatSync(
        {
          content: overviewPrompt,
        },
        'gpt-4o-mini',
      );
    } catch (error) {
      this.logger.error('Error generating backend overview:', error);
      return {
        success: false,
        error: new Error('Failed to generate backend overview.'),
      };
    }

    // Generate backend implementation details
    const implementationPrompt = generateBackendImplementationPrompt(
      backendOverview,
      language,
      framework,
    );

    let implementationDetails: string;
    try {
      implementationDetails = await context.model.chatSync(
        {
          content: implementationPrompt,
        },
        'gpt-4o-mini',
      );
    } catch (error) {
      this.logger.error(
        'Error generating backend implementation details:',
        error,
      );
      return {
        success: false,
        error: new Error('Failed to generate backend implementation details.'),
      };
    }

    // Return generated data
    return {
      success: true,
      data: {
        overview: backendOverview,
        implementation: implementationDetails,
        config: {
          language,
          framework,
          packages,
        },
      },
    };
  }
}
