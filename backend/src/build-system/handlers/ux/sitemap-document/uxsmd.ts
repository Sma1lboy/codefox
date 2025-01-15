import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { prompts } from './prompt';
import { ModelProvider } from 'src/common/model-provider';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import { BuildMonitor } from 'src/build-system/monitor';
import { MessageInterface } from 'src/common/model-provider/types';
import { chatSyncWithClocker } from 'src/build-system/utils/handler-helper';

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
    const uxsmdContent = await this.generateUXSMDFromLLM(context, prompt);

    // Store the generated document in the context
    context.setGlobalContext('uxsmdDocument', uxsmdContent);

    // Return the generated document
    return {
      success: true,
      data: removeCodeBlockFences(uxsmdContent),
    };
  }

  private async generateUXSMDFromLLM(context: BuilderContext, prompt: string): Promise<string> {
    const modelProvider = ModelProvider.getInstance();
    const model = 'gpt-4o-mini';

    let messages: MessageInterface[] = [{content: prompt, role: 'system'}];
    const uxsmdContent = await chatSyncWithClocker(context, messages, 'gpt-4o-mini', 'generateUXSMDFromLLM', this.id);
    this.logger.log('Received full UXSMD content from LLM server.');
    return uxsmdContent;
  }
}
