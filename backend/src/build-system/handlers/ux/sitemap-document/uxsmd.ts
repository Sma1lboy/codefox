import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { prompts } from './prompt/prompt';
import { ModelProvider } from 'src/common/model-provider';
import { Logger } from '@nestjs/common';

export class UXSMDHandler implements BuildHandler {
  readonly id = 'op:UXSMD::STATE:GENERATE';
  readonly logger: Logger = new Logger('UXSMDHandler');

  async run(context: BuilderContext, args: unknown): Promise<BuildResult> {
    this.logger.log('Generating UXSMD...');

    // Extract project data from the context
    const projectName =
      context.getData('projectName') || 'Default Project Name';
    const platform = context.getData('platform') || 'Default Platform';

    // Generate the prompt dynamically
    const prompt = prompts.generateUxsmdrompt(
      projectName,
      args as string,
      platform,
    );

    // Send the prompt to the LLM server and process the response
    const uxsmdContent = await this.generateUXSMDFromLLM(prompt);

    // Store the generated document in the context
    context.setData('uxsmdDocument', uxsmdContent);

    return {
      success: true,
      data: uxsmdContent,
    };
  }

  private async generateUXSMDFromLLM(prompt: string): Promise<string> {
    const modelProvider = ModelProvider.getInstance();

    const model = 'gpt-4o-mini';

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
