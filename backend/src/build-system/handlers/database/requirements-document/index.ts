import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { ModelProvider } from 'src/common/model-provider';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import {
  MissingConfigurationError,
  ResponseParsingError,
  ModelUnavailableError,
  TemporaryServiceUnavailableError,
  RateLimitExceededError,
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
      const messages: MessageInterface[] = [
        { content: prompt, role: 'system' },
      ];
      dbRequirementsContent = await chatSyncWithClocker(
        context,
        messages,
        'gpt-4o-mini',
        'generateDatabaseRequirementPrompt',
        this.id,
      );

      if (!dbRequirementsContent) {
        throw new ModelUnavailableError(
          'The model did not respond within the expected time.',
        );
      }

      if (dbRequirementsContent.trim() === '') {
        throw new ResponseParsingError(
          'Generated database requirements content is empty.',
        );
      }
    } catch (error) {
      this.logger.error(
        'Error during database requirements generation:',
        error,
      );
      throw error; // Propagate error to upper-level handler
    }

    return {
      success: true,
      data: removeCodeBlockFences(dbRequirementsContent),
    };
  }
}
