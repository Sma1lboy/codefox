import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { ModelProvider } from 'src/common/model-provider';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';

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
    const dbRequirementsContent = await model.chatSync(
      {
        content: prompt,
      },
      'gpt-4o-mini',
    );
    return {
      success: true,
      data: dbRequirementsContent,
    };
  }
}
