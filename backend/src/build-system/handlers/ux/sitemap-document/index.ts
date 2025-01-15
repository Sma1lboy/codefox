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
    const prompt = prompts.generateUxsmdPrompt(projectName, platform);

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
          Here is the **Product Requirements Document (PRD)**:

          ${prdContent}

          Please generate the Full UX Sitemap Document now, focusing on MVP features but ensuring each page has enough detail to be functional.`,
      },
      {
        role: 'user',
        content: `**Validation Step:**  
      - **Review your output** to ensure **100% coverage** of the PRD.
      - Make sure you covered all global_view_* and page_view_* in UX Sitemap Document, If any of them is missing add them based on the system prompt.
      - If any critical pages, features, or flows are **missing**, **add them**.  
      - Adjust for **navigation completeness**, making sure all interactions and workflows are **correctly linked**.`,
      },
      {
        role: 'user',
        content: `**Final Refinement:**  
        - **Expand the Unique UI Pages **, adding page_view_* if needed:
        - **Expand the page_views **, adding more details on:
        - **Step-by-step user actions** within each page.
        - **Alternative user paths** (e.g., different ways a user might complete an action).  
        - **How components within the page interact** with each other and primary features.
      - **Ensure clarity** so developers can implement the structure **without assumptions**.`,
      },
    ];

    const modelProvider = ModelProvider.getInstance();
    const model = 'gpt-4o';

    const uxsmdContent = await modelProvider.chatSync({
      model,
      messages,
    });

    this.logger.log('Received full UXSMD content from LLM server.');
    return uxsmdContent;
  }
}
