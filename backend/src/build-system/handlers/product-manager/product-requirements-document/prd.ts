import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import { chatSyncWithClocker } from 'src/build-system/utils/handler-helper';
import { MessageInterface } from 'src/common/model-provider/types';
import {
  MissingConfigurationError,
  ModelUnavailableError,
  ResponseParsingError,
} from 'src/build-system/errors';

export class PRDHandler implements BuildHandler {
  readonly id = 'op:PRD';
  readonly logger: Logger = new Logger('PRDHandler');

  async run(context: BuilderContext): Promise<BuildResult> {
    this.logger.log('Generating PRD...');

    // Extract project data from the context
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';
    const description =
      context.getGlobalContext('description') || 'Default Description';
    const platform = context.getGlobalContext('platform') || 'Default Platform';

    // Validate extracted data
    if (!projectName || typeof projectName !== 'string') {
      throw new MissingConfigurationError('Missing or invalid projectName.');
    }
    if (!description || typeof description !== 'string') {
      throw new MissingConfigurationError('Missing or invalid description.');
    }
    if (!platform || typeof platform !== 'string') {
      throw new MissingConfigurationError('Missing or invalid platform.');
    }

    // Generate the prompt dynamically
    const prompt = prompts.generatePRDPrompt(
      projectName,
      description,
      platform,
    );

    try {
      // Send the prompt to the LLM server and process the response
      const prdContent = await this.generatePRDFromLLM(context, prompt);

      if (!prdContent || prdContent.trim() === '') {
        throw new ResponseParsingError('Generated PRD content is empty.');
      }

      return {
        success: true,
        data: removeCodeBlockFences(prdContent),
      };
    } catch (error) {
      this.logger.error('Error during PRD generation:', error);
      throw new ResponseParsingError('Failed to generate PRD.');
    }
  }
  private async generatePRDFromLLM(
    context: BuilderContext,
    prompt: string,
  ): Promise<string> {
    try {
      const messages: MessageInterface[] = [
        { content: prompt, role: 'system' },
      ];
      const prdContent = await chatSyncWithClocker(
        context,
        messages,
        'gpt-4o-mini',
        'generatePRDFromLLM',
        this.id,
      );
      if (!prdContent || prdContent.trim() === '') {
        throw new ModelUnavailableError(
          'LLM server returned empty PRD content.',
        );
      }

      this.logger.log('Received full PRD content from LLM server.');
      return prdContent;
    } catch (error) {
      throw error;
    }
  }
}
