import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { ModelProvider } from 'src/common/model-provider';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import {
  MissingConfigurationError,
  ModelUnavailableError,
} from 'src/build-system/errors';
import { chatSyncWithClocker } from 'src/build-system/utils/handler-helper';
import { MessageInterface } from 'src/common/model-provider/types';

export class DatabaseRequirementHandler implements BuildHandler<string> {
  readonly id = 'op:DATABASE_REQ';
  private readonly logger = new Logger('DatabaseRequirementHandler');

  async run(context: BuilderContext): Promise<BuildResult<string>> {
    const model = ModelProvider.getInstance();
    this.logger.log('Generating Database Requirements Document...');
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';

    const datamapDoc = context.getNodeData('op:UX:DATAMAP:DOC');

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
        this.id,
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
