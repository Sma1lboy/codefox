import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { prompts } from './prompt/prompt';
import { ModelProvider } from 'src/common/model-provider';
import { StreamStatus } from 'src/chat/chat.model';
import * as fs from 'fs';
import * as path from 'path';

export class PRDHandler implements BuildHandler {
  readonly id = 'op:PRD::STATE:GENERATE';

  async run(context: BuilderContext): Promise<BuildResult> {
    console.log('Generating PRD...');

    // Extract project data from the context
    const projectName =
      context.getData('projectName') || 'Default Project Name';
    const description = context.getData('description') || 'Default Description';
    const platform = context.getData('platform') || 'Default Platform';

    // Generate the prompt dynamically
    const prompt = prompts.generatePRDPrompt(
      projectName,
      description,
      platform,
    );

    // Send the prompt to the LLM server and process the response
    const prdContent = await this.generatePRDFromLLM(prompt);

    // Save the PRD content to context for further use
    context.setData('prdDocument', prdContent);

    return {
      success: true,
      data: prdContent,
    };
  }

  private async generatePRDFromLLM(prompt: string): Promise<string> {
    const modelProvider = ModelProvider.getInstance();

    const model = 'gpt-3.5-turbo';

    // Call the chat method with the model specified
    const chatStream = modelProvider.chat(
      {
        content: prompt,
      },
      model,
    ); // Pass the model here

    const prdContent = modelProvider.chunkSync(chatStream);

    console.log('Received full PRD content from LLM server.');
    return prdContent;
  }
}
