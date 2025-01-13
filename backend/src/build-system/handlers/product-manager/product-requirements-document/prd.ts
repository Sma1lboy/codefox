import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { prompts } from './prompt';
import { ModelProvider } from 'src/common/model-provider';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import { RetryableError, NonRetryableError } from 'src/build-system/retry-handler';

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
      return {
        success: false,
        error: new NonRetryableError('Missing or invalid projectName.'),
      };
    }
    if (!description || typeof description !== 'string') {
      return {
        success: false,
        error: new NonRetryableError('Missing or invalid description.'),
      };
    }
    if (!platform || typeof platform !== 'string') {
      return {
        success: false,
        error: new NonRetryableError('Missing or invalid platform.'),
      };
    }

    // Generate the prompt dynamically
    const prompt = prompts.generatePRDPrompt(projectName, description, platform);

    try {
      // Send the prompt to the LLM server and process the response
      const prdContent = await this.generatePRDFromLLM(prompt);

      if (!prdContent || prdContent.trim() === '') {
        throw new RetryableError('Generated PRD content is empty.');
      }

      return {
        success: true,
        data: removeCodeBlockFences(prdContent),
      };
    } catch (error) {
      if (error instanceof RetryableError) {
        this.logger.warn(`Retryable error during PRD generation: ${error.message}`);
        return {
          success: false,
          error,
        };
      }

      this.logger.error('Non-retryable error during PRD generation:', error);
      return {
        success: false,
        error: new NonRetryableError('Failed to generate PRD.'),
      };
    }
  }

  private async generatePRDFromLLM(prompt: string): Promise<string> {
    try {
      const modelProvider = ModelProvider.getInstance();
      const prdContent = await modelProvider.chatSync({
        model: 'gpt-4o-mini',
        messages: [{ content: prompt, role: 'system' }],
      });

      this.logger.log('Received full PRD content from LLM server.');
      return prdContent;
    } catch (error) {
      this.logger.error('Error communicating with the LLM server:', error);
      throw new RetryableError('Failed to communicate with the LLM server.');
    }
  }
}
