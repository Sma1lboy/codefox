import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { ModelProvider } from 'src/common/model-provider';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';
import { removeCodeBlockFences } from 'src/build-system/utils/strings';
import { BuildMonitor } from 'src/build-system/monitor';

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
    const model = ModelProvider.getInstance();

    const startTime = new Date();
    const dbRequirementsContent = await model.chatSync({
      model: 'gpt-4o-mini',
      messages: [{ content: prompt, role: 'system' }],
    });
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    BuildMonitor.timeRecorder(
      duration,
      this.id,
      'generateDatabaseRequirementPrompt',
      prompt,
      dbRequirementsContent,
    );
    return {
      success: true,
      data: removeCodeBlockFences(dbRequirementsContent),
    };
  }
}
