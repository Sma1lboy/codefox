import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { ModelProvider } from 'src/common/model-provider';
import { prompts } from './prompt';

/**
 * Handler for generating the UX Data Map document.
 */
export class UXDatamapHandler implements BuildHandler<string> {
  readonly id = 'op:UX:DATAMAP:DOC';

  async run(context: BuilderContext): Promise<BuildResult<string>> {
    console.log('Generating UX Data Map Document...');

    // Extract relevant data from the context
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';
    const sitemapDoc = context.getNodeData('op:UX:SMD');

    const prompt = prompts.generateUXDataMapPrompt(
      projectName,
      sitemapDoc,
      'web', // TODO: change platform dynamically if needed
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
