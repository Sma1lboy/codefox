import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { ModelProvider } from 'src/common/model-provider';
import { prompts } from './prompt';

export class UXDatamapHandler implements BuildHandler {
  readonly id = 'op:UX_DATAMAP::STATE:GENERATE';

  async run(context: BuilderContext, args: unknown): Promise<BuildResult> {
    console.log('Generating UX Data Map Document...');

    // extract relevant data from the context
    const projectName =
      context.getData('projectName') || 'Default Project Name';
    const uxGoals = context.getData('uxGoals') || 'Default UX Goals';

    // generate the UX Data Map prompt dynamically

    const prompt = prompts.generateUXDataMapPrompt(
      projectName,
      args as string,
      // TODO: change later
      'web',
    );

    const uxDatamapContent = await context.model.chatSync(
      {
        content: prompt,
      },
      'gpt-4o-mini',
    );
    return {
      success: true,
      data: uxDatamapContent,
    };
  }
}
