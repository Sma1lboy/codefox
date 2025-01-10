import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { prompts } from './prompt';
import { ModelProvider } from 'src/common/model-provider';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import { MessageInterface } from 'src/common/model-provider/types';

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
    const prompt = prompts.generateUxsmdrompt(projectName, platform);

    // Send the prompt to the LLM server and process the response
    const uxsmdContent = await this.generateUXSMDFromLLM(prompt, prdContent);

    // Store the generated document in the context
    context.setGlobalContext('uxsmdDocument', uxsmdContent);

    // Return the generated document
    return {
      success: true,
      data: removeCodeBlockFences(uxsmdContent),
    };
  }

  private async generateUXSMDFromLLM(
    prompt: string,
    prdContent: string,
  ): Promise<string> {
    const messages: MessageInterface[] = [
      {
        role: 'system',
        content: prompt,
      },
      {
        role: 'user',
        content: `
          Here is the Product Requirements Document (PRD):

          ${prdContent}

          Please generate the Full UX Sitemap Document now, focusing on MVP features but ensuring each page (especially Home) has enough detail to be functional.`,
      },
      {
        role: 'user',
        content: `Check if you meet all PRD details, add more pages, and details if needed. Focus on MVP (Minimum Viable Product).`,
      },
      {
        role: 'user',
        content: `Please add more detail about the Core Components in each <gen_page>. 
      Focus on step-by-step actions the user takes, and any alternative paths mentioned in the PRD. 
      Also, expand on how these components interrelate to the page's primary features.`,
      },
    ];

    const modelProvider = ModelProvider.getInstance();
    const model = 'gpt-4o-mini';

    const uxsmdContent = await modelProvider.chatSync({
      model,
      messages,
    });

    this.logger.log('Received full UXSMD content from LLM server.');
    return uxsmdContent;
  }
}
