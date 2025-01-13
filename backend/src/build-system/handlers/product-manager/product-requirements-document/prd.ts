import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { prompts } from './prompt';
import { ModelProvider } from 'src/common/model-provider';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import {
  MissingConfigurationError,
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
      const prdContent = await this.generatePRDFromLLM(prompt);

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

  private async generatePRDFromLLM(prompt: string): Promise<string> {
    try {
      const modelProvider = ModelProvider.getInstance();
      const prdContent = await modelProvider.chatSync({
        model: 'gpt-4o-mini',
        messages: [{ content: prompt, role: 'system' }],
      });

      if (!prdContent || prdContent.trim() === '') {
        throw new ResponseParsingError('LLM server returned empty PRD content.');
      }

      this.logger.log('Received full PRD content from LLM server.');
      return prdContent;
    } catch (error) {
      if (error.message.includes('timeout')) {
        this.logger.error('Timeout error communicating with the LLM server.');
        throw new ResponseParsingError('Timeout occurred while communicating with the LLM server.');
      }
      if (error.message.includes('service unavailable')) {
        this.logger.error('LLM server is temporarily unavailable.');
        throw new ResponseParsingError('LLM server is temporarily unavailable.');
      }
      this.logger.error('Unexpected error communicating with the LLM server:', error);
      throw new ResponseParsingError('Unexpected error during communication with the LLM server.');
    }
  }
}
