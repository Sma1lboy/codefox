import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { ModelProvider } from 'src/common/model-provider';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';

export class DatabaseRequirementHandler implements BuildHandler {
  readonly id = 'op:DATABASE_REQ::STATE:GENERATE';
  readonly logger = new Logger('DatabaseRequirementHandler');
  async run(context: BuilderContext, args: unknown): Promise<BuildResult> {
    this.logger.log('Generating Database Requirements Document...');
    const projectName =
      context.getData('projectName') || 'Default Project Name';

    const prompt = prompts.generateDatabaseRequirementPrompt(
      projectName,
      args as string,
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
