import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { generateFileArchPrompt } from './prompt';
import { Logger } from '@nestjs/common';

export class FileArchGenerateHandler implements BuildHandler {
  readonly id = 'op:File_Arch::STATE:GENERATE';
  private readonly logger: Logger = new Logger('FileArchGenerateHandler');

  // TODO: adding page by page analysis
  async run(context: BuilderContext, ...args: any[]): Promise<BuildResult> {
    this.logger.log('Generating File Architecture Document...');

    const fileStructure = args[0] as string;
    const dataMapStruct = args[1] as string;

    if (!fileStructure || !dataMapStruct) {
      return {
        success: false,
        error: new Error(
          'Missing required parameters: fileStructure or pageByPageAnalysis',
        ),
      };
    }

    const prompt = generateFileArchPrompt(fileStructure, dataMapStruct);

    const fileArchContent = await context.model.chatSync(
      {
        content: prompt,
      },
      'gpt-4o-mini',
    );

    return {
      success: true,
      data: fileArchContent,
    };
  }
}
