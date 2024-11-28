import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { ModelProvider } from 'src/common/model-provider';
import { prompts } from './prompt';

export class UXStructureHandler implements BuildHandler {
  readonly id = 'op:UX_Structure::STATE:GENERATE';

  async run(context: BuilderContext, args: unknown): Promise<BuildResult> {
    console.log('Generating UX Structure Document...');

    // extract relevant data from the context
    const projectName =
      context.getData('projectName') || 'Default Project Name';

    const prompt = prompts.generateUXDataMapPrompt(
      projectName,
      args as string,
      // TODO: change later
      'web',
    );

    const uxStructureContent = await context.model.chatSync(
      {
        content: prompt,
      },
      'gpt-4o-mini',
    );
    return {
      success: true,
      data: uxStructureContent,
    };
  }
}