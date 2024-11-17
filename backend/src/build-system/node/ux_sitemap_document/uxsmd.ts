import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { prompts } from './prompt/prompt';
import { ModelProvider } from 'src/common/model-provider';
import { Logger } from '@nestjs/common';

export class UXSMDHandler implements BuildHandler {
  readonly id = 'op:UXSMD::STATE:GENERATE';
  readonly logger: Logger = new Logger('UXSMDHandler');

  async run(context: BuilderContext): Promise<BuildResult> {
    this.logger.log('Generating UXSMD...');

    // Extract project data from the context
    const projectName =
      context.getData('projectName') || 'Default Project Name';
    const prdDocument = context.getData('prdDocument') || 'Default prdDocument';
    const platform = context.getData('platform') || 'Default Platform';

    // Generate the prompt dynamically
    const prompt = prompts.generateUxsmdrompt(
      projectName,
      prdDocument,
      platform,
    );

    // Send the prompt to the LLM server and process the response
    const uxsmdContent = await this.generateUXSMDFromLLM(prompt);

    return {
      success: true,
      data: uxsmdContent,
    };
  }

  private async generateUXSMDFromLLM(prompt: string): Promise<string> {
    const modelProvider = ModelProvider.getInstance();

    const model = 'gpt-3.5-turbo';

    const prdContent = modelProvider.chatSync(
      {
        content: prompt,
      },
      model,
    );

    this.logger.log('Received full UXSMD content from LLM server.');
    return prdContent;
  }
}
