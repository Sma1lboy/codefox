import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { ModelProvider } from 'src/common/model-provider';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import { BuildMonitor } from 'src/build-system/monitor';
import { chatSyncWithClocker } from 'src/build-system/utils/handler-helper';
import { MessageInterface } from 'src/common/model-provider/types';

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

    let messages: MessageInterface[] = [{content: prompt, role: 'system'}];
    const uxStructureContent = await chatSyncWithClocker(context, messages, 'gpt-4o-mini', 'generateUXSiteMapStructre', this.id);
    

    return {
      success: true,
      data: removeCodeBlockFences(uxStructureContent),
    };
  }
}
