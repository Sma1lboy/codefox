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
import { UXDMDHandler } from '../../ux/datamap';
import { BuildNode, BuildNodeRequire } from 'src/build-system/hanlder-manager';

@BuildNode()
@BuildNodeRequire([UXDMDHandler])
export class DBRequirementHandler implements BuildHandler<string> {
  private readonly logger = new Logger('DatabaseRequirementHandler');

  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.logger.log('Generating Database Requirements Document...');
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';

    const datamapDoc = context.getNodeData(UXDMDHandler);

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
        DBRequirementHandler.name,
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
