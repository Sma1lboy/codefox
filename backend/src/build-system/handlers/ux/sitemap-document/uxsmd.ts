import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { prompts } from './prompt';
import { ModelProvider } from 'src/common/model-provider';
import { Logger } from '@nestjs/common';

export class UXSMDHandler implements BuildHandler<string> {
  readonly id = 'op:UX:SMD';
  readonly logger: Logger = new Logger('UXSMDHandler');

  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.logger.log('Generating UXSMD...');

    // Extract project data from the context
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';
    const platform = context.getGlobalContext('platform') || 'Default Platform';
    const prdContent = context.getNodeData('op:PRD');

    // Generate the prompt dynamically
    const prompt = prompts.generateUxsmdrompt(
      projectName,
      prdContent,
      platform,
    );

    // Send the prompt to the LLM server and process the response
    const uxsmdContent = await this.generateUXSMDFromLLM(prompt);

    // Store the generated document in the context
    context.setGlobalContext('uxsmdDocument', uxsmdContent);

    // Return the generated document
    return {
      success: true,
      data: uxsmdContent,
    };
  }

  private async generateUXSMDFromLLM(prompt: string): Promise<string> {
    const modelProvider = ModelProvider.getInstance();
    const model = 'gpt-4o-mini';

    const uxsmdContent = await modelProvider.chatSync(
      {
        content: prompt,
      },
      model,
    );

    this.logger.log('Received full UXSMD content from LLM server.');
    return uxsmdContent;
  }
}
