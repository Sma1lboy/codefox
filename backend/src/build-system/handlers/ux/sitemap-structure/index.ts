import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { ModelProvider } from 'src/common/model-provider';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import { BuildMonitor } from 'src/build-system/monitor';

// UXSMS: UX Sitemap Structure
export class UXSitemapStructureHandler implements BuildHandler<string> {
  readonly id = 'op:UX:SMS';
  readonly logger = new Logger('UXSitemapStructureHandler');

  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.logger.log('Generating UX Structure Document...');

    // extract relevant data from the context
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';
    const sitemapDoc = context.getNodeData('op:UX:SMD');

    if (!sitemapDoc) {
      return {
        success: false,
        error: new Error('Missing required parameters: sitemap'),
      };
    }

    const prompt = prompts.generateUXSiteMapStructrePrompt(
      projectName,
      sitemapDoc,
      'web', // TODO: Change platform dynamically if necessary
    );

    const startTime = new Date();
    const uxStructureContent = await context.model.chatSync({
      model: 'gpt-4o-mini',
      messages: [{ content: prompt, role: 'system' }],
    });
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    BuildMonitor.timeRecorder(
      duration,
      this.id,
      'generateUXSiteMapStructre',
      prompt,
      uxStructureContent,
    );

    return {
      success: true,
      data: removeCodeBlockFences(uxStructureContent),
    };
  }
}
