import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { ModelProvider } from 'src/common/model-provider';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import {
  MissingConfigurationError,
  ResponseParsingError,
  ModelTimeoutError,
  TemporaryServiceUnavailableError,
  RateLimitExceededError,
} from 'src/build-system/errors';

export class DatabaseRequirementHandler implements BuildHandler<string> {
  readonly id = 'op:DATABASE_REQ';
  private readonly logger = new Logger('DatabaseRequirementHandler');

  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.logger.log('Generating Database Requirements Document...');
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';

    const datamapDoc = context.getNodeData('op:UX:DATAMAP:DOC');

    if (!datamapDoc) {
      this.logger.error('Data mapping document is missing.');
      throw new MissingConfigurationError('Missing required parameter: datamapDoc.');
    }

    const prompt = prompts.generateDatabaseRequirementPrompt(
      projectName,
      datamapDoc,
    );

    let dbRequirementsContent: string;

    try {
      dbRequirementsContent = await this.callModel(prompt);
      if (!dbRequirementsContent || dbRequirementsContent.trim() === '') {
        throw new ResponseParsingError('Generated database requirements content is empty.');
      }
    } catch (error) {
      this.logger.error('Error during database requirements generation:', error);
      throw error; // Propagate error to upper-level handler
    }

    return {
      success: true,
      data: removeCodeBlockFences(dbRequirementsContent),
    };
  }

  /**
   * Calls the language model to generate database requirements.
   * @param prompt The generated prompt.
   */
  private async callModel(prompt: string): Promise<string> {
    const model = ModelProvider.getInstance();
    try {
      const modelResponse = await model.chatSync({
        model: 'gpt-4o-mini',
        messages: [{ content: prompt, role: 'system' }],
      });

      if (!modelResponse) {
        throw new ModelTimeoutError('The model did not respond within the expected time.');
      }

      return modelResponse;
    } catch (error) {
      if (error.message.includes('timeout')) {
        throw new ModelTimeoutError('Timeout occurred while communicating with the model.');
      }
      if (error.message.includes('service unavailable')) {
        throw new TemporaryServiceUnavailableError('Model service is temporarily unavailable.');
      }
      if (error.message.includes('rate limit')) {
        throw new RateLimitExceededError('Rate limit exceeded for model service.');
      }
      throw new Error(`Unexpected model error: ${error.message}`);
    }
  }
}
