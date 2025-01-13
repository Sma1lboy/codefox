import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { prompts } from './prompt';
import { ModelProvider } from 'src/common/model-provider';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import { RetryableError, NonRetryableError } from 'src/build-system/retry-handler';

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
      return {
        success: false,
        error: new NonRetryableError('Missing or invalid projectName.'),
      };
    }
    if (!platform || typeof platform !== 'string') {
      return {
        success: false,
        error: new NonRetryableError('Missing or invalid platform.'),
      };
    }
    if (!prdContent || typeof prdContent !== 'string') {
      return {
        success: false,
        error: new NonRetryableError('Missing or invalid PRD content.'),
      };
    }

    // Generate the prompt dynamically
    const prompt = prompts.generateUxsmdrompt(projectName, prdContent, platform);

    try {
      // Generate UXSMD content using the language model
      const uxsmdContent = await this.generateUXSMDFromLLM(prompt);

      if (!uxsmdContent || uxsmdContent.trim() === '') {
        throw new RetryableError('Generated UXSMD content is empty.');
      }

      // Store the generated document in the context
      context.setGlobalContext('uxsmdDocument', uxsmdContent);

      this.logger.log('Successfully generated UXSMD content.');
      return {
        success: true,
        data: removeCodeBlockFences(uxsmdContent),
      };
    } catch (error) {
      if (error instanceof RetryableError) {
        this.logger.warn(`Retryable error during UXSMD generation: ${error.message}`);
        return {
          success: false,
          error,
        };
      }

      this.logger.error('Non-retryable error during UXSMD generation:', error);
      return {
        success: false,
        error: new NonRetryableError('Failed to generate UXSMD document.'),
      };
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
      this.logger.error('Error communicating with the LLM server:', error);
      throw new RetryableError('Failed to communicate with the LLM server.');
    }
  }
}
