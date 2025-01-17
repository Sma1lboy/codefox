import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import {
  MissingConfigurationError,
  ModelUnavailableError,
} from 'src/build-system/errors';
import { chatSyncWithClocker } from 'src/build-system/utils/handler-helper';
import { UXDatamapHandler } from '../../ux/datamap';
import { BuildNode, BuildNodeRequire } from 'src/build-system/hanlder-manager';

@BuildNode()
@BuildNodeRequire([UXDatamapHandler])
export class DatabaseRequirementHandler implements BuildHandler<string> {
  private readonly logger = new Logger('DatabaseRequirementHandler');

  async run(context: BuilderContext): Promise<BuildResult<string>> {
    const model = context.model;
    this.logger.log('Generating Database Requirements Document...');
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';

    const datamapDoc = context.getNodeData(UXDatamapHandler);

    if (!datamapDoc) {
      this.logger.error('Data mapping document is missing.');
      throw new MissingConfigurationError(
        'Missing required parameter: datamapDoc.',
      );
    }

    const prompt = prompts.generateDatabaseRequirementPrompt(
      projectName,
      datamapDoc,
    );

    let dbRequirementsContent: string;

    try {
      dbRequirementsContent = await chatSyncWithClocker(
        context,
        {
          model: 'gpt-4o-mini',
          messages: [{ content: prompt, role: 'system' }],
        },
        'generateDatabaseRequirementPrompt',
        DatabaseRequirementHandler.name,
      );
    } catch (error) {
      throw new ModelUnavailableError('Model Unavailable:' + error);
    }

    return {
      success: true,
      data: removeCodeBlockFences(dbRequirementsContent),
    };
  }
}
