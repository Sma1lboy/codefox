import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { ModelProvider } from 'src/common/model-provider';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import { NonRetryableError, RetryableError } from 'src/build-system/retry-handler';

export class DatabaseRequirementHandler implements BuildHandler<string> {
  readonly id = 'op:DATABASE_REQ';
  readonly logger = new Logger('DatabaseRequirementHandler');

  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.logger.log('Generating Database Requirements Document...');
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';

    const datamapDoc = context.getNodeData('op:UX:DATAMAP:DOC');

    if (!datamapDoc) {
      this.logger.error('Data mapping document is missing.');
      return {
        success: false,
        error: new NonRetryableError('Missing required parameter: datamapDoc.'),
      };
    }

    const prompt = prompts.generateDatabaseRequirementPrompt(
      projectName,
      datamapDoc,
    );

    const model = ModelProvider.getInstance();
    let dbRequirementsContent: string;

    try {
      dbRequirementsContent = await model.chatSync({
        model: 'gpt-4o-mini',
        messages: [{ content: prompt, role: 'system' }],
      });

      if (!dbRequirementsContent || dbRequirementsContent.trim() === '') {
        throw new RetryableError('Generated database requirements content is empty.');
      }
    } catch (error) {
      if (error instanceof RetryableError) {
        this.logger.warn(`Retryable error encountered: ${error.message}`);
        return {
          success: false,
          error,
        };
      }

      this.logger.error('Non-retryable error encountered:', error);
      return {
        success: false,
        error: new NonRetryableError('Failed to generate database requirements document.'),
      };
    }

    return {
      success: true,
      data: removeCodeBlockFences(dbRequirementsContent),
    };
  }
}
