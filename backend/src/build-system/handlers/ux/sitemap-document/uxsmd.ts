import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import { MessageInterface } from 'src/common/model-provider/types';
import { chatSyncWithClocker } from 'src/build-system/utils/handler-helper';
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

    // Send the prompt to the LLM server and process the response

    try {
      // Generate UXSMD content using the language model
      const uxsmdContent = await this.generateUXSMDFromLLM(context, prompt);

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
      throw error;
    }
  }

  private async generateUXSMDFromLLM(
    context: BuilderContext,
    prompt: string,
  ): Promise<string> {
    try {
      const messages: MessageInterface[] = [
        { content: prompt, role: 'system' },
      ];
      const uxsmdContent = await chatSyncWithClocker(
        context,
        messages,
        'gpt-4o-mini',
        'generateUXSMDFromLLM',
        this.id,
      );
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
