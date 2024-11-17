import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';

export class DBSchemaHandler implements BuildHandler {
  readonly id = 'OP:DATABASE:SCHEMAS';

  readonly logger = new Logger('DBSchemaHandler');

  async run(context: BuilderContext, args: unknown): Promise<BuildResult> {
    const projectName =
      context.getData('projectName') || 'Default Project Name';
    const databaseType = context.getData('databaseType') || 'PostgreSQL';

    const analysisPrompt = prompts.analyzeDatabaseRequirements(
      projectName,
      args as string,
      databaseType,
    );

    const dbAnalysis = await context.model.chatSync(
      {
        content: analysisPrompt,
      },
      'gpt-4o-mini',
    );

    const schemaPrompt = prompts.generateDatabaseSchema(
      dbAnalysis,
      databaseType,
    );

    const schemaContent = await context.model.chatSync(
      {
        content: schemaPrompt,
      },
      'gpt-4o-mini',
    );

    return {
      success: true,
      data: {
        schema: schemaContent,
      },
    };
  }
}
