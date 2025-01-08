import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { prompts } from './prompt';
import { ModelProvider } from 'src/common/model-provider';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';

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

    // Generate the prompt dynamically
    const prompt = prompts.generatePRDPrompt(
      projectName,
      description,
      platform,
    );

    // Send the prompt to the LLM server and process the response
    const prdContent = await this.generatePRDFromLLM(prompt);

    return {
      success: true,
      data: removeCodeBlockFences(prdContent),
    };
  }

  private async generatePRDFromLLM(prompt: string): Promise<string> {
    const modelProvider = ModelProvider.getInstance();
    const prdContent = await modelProvider.chatSync({
      model: 'gpt-4o-mini',
      messages: [{ content: prompt, role: 'system' }],
    });
    this.logger.log('Received full PRD content from LLM server.');
    return prdContent;
  }
}
