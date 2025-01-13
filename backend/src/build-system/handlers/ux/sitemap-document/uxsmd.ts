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

export class UXSMDHandler implements BuildHandler<string> {
  readonly id = 'op:UX:SMD';
  private readonly logger = new Logger('UXSMDHandler');

  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.logger.log('Generating UXSMD...');

    // Extract project data from the context
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';
    const platform = context.getGlobalContext('platform') || 'Default Platform';
    const prdContent = context.getNodeData('op:PRD');

    // Validate required data
    if (!projectName || typeof projectName !== 'string') {
      throw new MissingConfigurationError('Missing or invalid projectName.');
    }
    if (!platform || typeof platform !== 'string') {
      throw new MissingConfigurationError('Missing or invalid platform.');
    }
    if (!prdContent || typeof prdContent !== 'string') {
      throw new MissingConfigurationError('Missing or invalid PRD content.');
    }

    // Generate the prompt dynamically
    const prompt = prompts.generateUxsmdrompt(
      projectName,
      prdContent,
      platform,
    );

    try {
      // Generate UXSMD content using the language model
      const uxsmdContent = await this.generateUXSMDFromLLM(prompt);

      if (!uxsmdContent || uxsmdContent.trim() === '') {
        this.logger.error('Generated UXSMD content is empty.');
        throw new ResponseParsingError('Generated UXSMD content is empty.');
      }

      // Store the generated document in the context
      context.setGlobalContext('uxsmdDocument', uxsmdContent);

      this.logger.log('Successfully generated UXSMD content.');
      return {
        success: true,
        data: removeCodeBlockFences(uxsmdContent),
      };
    } catch (error) {
      this.logger.error('Error during UXSMD generation:', error);

      if (error.message.includes('timeout')) {
        throw new ResponseParsingError(
          'Timeout occurred while generating UXSMD.',
        );
      }
      if (error.message.includes('service unavailable')) {
        throw new ResponseParsingError(
          'Model service is temporarily unavailable.',
        );
      }
      if (error.message.includes('rate limit')) {
        throw new ResponseParsingError(
          'Rate limit exceeded while generating UXSMD.',
        );
      }

      throw new ResponseParsingError(
        'Unexpected error during UXSMD generation.',
      );
    }
  }

  private async generateUXSMDFromLLM(prompt: string): Promise<string> {
    const modelProvider = ModelProvider.getInstance();
    const model = 'gpt-4o-mini';

    try {
      const uxsmdContent = await modelProvider.chatSync({
        model,
        messages: [{ content: prompt, role: 'system' }],
      });

      this.logger.log('Received full UXSMD content from LLM server.');
      return uxsmdContent;
    } catch (error) {
      if (error.message.includes('timeout')) {
        throw new ResponseParsingError(
          'Timeout occurred while communicating with the model.',
        );
      }
      if (error.message.includes('service unavailable')) {
        throw new ResponseParsingError(
          'Model service is temporarily unavailable.',
        );
      }
      if (error.message.includes('rate limit')) {
        throw new ResponseParsingError(
          'Rate limit exceeded while communicating with the model.',
        );
      }

      this.logger.error(
        'Unexpected error communicating with the LLM server:',
        error,
      );
      throw new ResponseParsingError(
        'Failed to communicate with the LLM server.',
      );
    }
  }
}
