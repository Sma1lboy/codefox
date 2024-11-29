import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { ModelProvider } from 'src/common/model-provider';
import { prompts } from './prompt';

// UXSMS: UX Sitemap Structure
export class UXSitemapStructureHandler implements BuildHandler {
  readonly id = 'op:UXSMS::STATE:GENERATE';

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
