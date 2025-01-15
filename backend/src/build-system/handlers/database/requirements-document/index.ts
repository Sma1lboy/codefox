import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { ModelProvider } from 'src/common/model-provider';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import { BuildMonitor } from 'src/build-system/monitor';
import { chatSyncWithClocker } from 'src/build-system/utils/handler-helper';
import { MessageInterface } from 'src/common/model-provider/types';

export class DatabaseRequirementHandler implements BuildHandler<string> {
  readonly id = 'op:DATABASE_REQ';
  readonly logger = new Logger('DatabaseRequirementHandler');
  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.logger.log('Generating Database Requirements Document...');
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';

    const datamapDoc = context.getNodeData('op:UX:DATAMAP:DOC');

    const prompt = prompts.generateDatabaseRequirementPrompt(
      projectName,
      datamapDoc,
    );
    let messages: MessageInterface[] = [{content: prompt, role: 'system'}];
    const dbRequirementsContent = await chatSyncWithClocker(context, messages, 'gpt-4o-mini', 'generateDatabaseRequirementPrompt', this.id);
    
    return {
      success: true,
      data: removeCodeBlockFences(dbRequirementsContent),
    };
  }
}
