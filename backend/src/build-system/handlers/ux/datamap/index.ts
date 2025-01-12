import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { ModelProvider } from 'src/common/model-provider';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import { BuildMonitor } from 'src/build-system/monitor';

/**
 * Handler for generating the UX Data Map document.
 */
export class UXDatamapHandler implements BuildHandler<string> {
  readonly id = 'op:UX:DATAMAP:DOC';

  async run(context: BuilderContext): Promise<BuildResult<string>> {
    // Extract relevant data from the context
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';
    const sitemapDoc = context.getNodeData('op:UX:SMD');

    const prompt = prompts.generateUXDataMapPrompt(
      projectName,
      sitemapDoc,
      'web', // TODO: change platform dynamically if needed
    );

    const startTime = new Date();
    const uxDatamapContent = await context.model.chatSync({
      model: 'gpt-4o-mini',
      messages: [{ content: prompt, role: 'system' }],
    });
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    BuildMonitor.timeRecorder(
      duration,
      this.id,
      'generateUXDataMap',
      prompt,
      uxDatamapContent,
    );
    Logger.log('UX Data Map Content: ', uxDatamapContent);

    return {
      success: true,
      data: removeCodeBlockFences(uxDatamapContent),
    };
  }
}
