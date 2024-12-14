import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import {
  generateBackendImplementationPrompt,
  generateBackendOverviewPrompt,
} from './prompt';
import { Logger } from '@nestjs/common';

export class BackendRequirementHandler implements BuildHandler {
  readonly id = 'op:BACKEND_REQ::STATE:GENERATE';

  readonly logger: Logger = new Logger('BackendRequirementHandler');
  async run(context: BuilderContext, args: unknown): Promise<BuildResult> {
    this.logger.log('Generating Backend Requirements Document...');

    // Validate and extract args
    if (!args || typeof args !== 'object') {
      throw new Error('Backend configuration is required');
    }
    // TODO: init language, framework, packages later in context
    const language = context.getData('language') || 'javascript';
    const framework = context.getData('framework') || 'express';
    const packages = context.getData('packages') || {};
    // TODO: adding graphql/restful later

    const { dbRequirements } = args as {
      dbRequirements: string;
      language: string;
      framework: string;
      packages: Record<string, string>;
    };

    const overviewPrompt = generateBackendOverviewPrompt(
      context.getData('projectName') || 'Default Project Name',
      dbRequirements,
      language,
      framework,
      packages,
    );

    const backendOverview = await context.model.chatSync(
      {
        content: overviewPrompt,
      },
      'gpt-4o-mini',
    );

    const implementationPrompt = generateBackendImplementationPrompt(
      backendOverview,
      language,
      framework,
    );

    const implementationDetails = await context.model.chatSync(
      {
        content: implementationPrompt,
      },
      'gpt-4o-mini',
    );

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
