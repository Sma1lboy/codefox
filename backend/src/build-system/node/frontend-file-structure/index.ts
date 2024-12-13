import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { ModelProvider } from 'src/common/model-provider';
import { prompts } from './prompt';
import { Logger } from '@nestjs/common';

export class FileStructureHandler implements BuildHandler {
  readonly id = 'op:FSTRUCT::STATE:GENERATE';
  private readonly logger: Logger = new Logger('FileStructureHandler');

  async run(context: BuilderContext, args: unknown): Promise<BuildResult> {
    this.logger.log('Generating File Structure Document...');

    // extract relevant data from the context
    const projectName =
      context.getData('projectName') || 'Default Project Name';

    const sitemapDoc = args[0] as string;
    const dataMap = args[1] as string;

    if (!dataMap || !sitemapDoc) {
      return {
        success: false,
        error: new Error('Missing required parameters: sitemapDoc or dataMap'),
      };
    }

    const prompt = prompts.generateFileStructurePrompt(
      projectName,
      JSON.stringify(sitemapDoc, null, 2),
      JSON.stringify(dataMap, null, 2),
      'FrameWork Holder',
    );

    // Call the chatSync function to get the file structure content.
    const fileStructureContent = await context.model.chatSync(
      {
        content: prompt,
      },
      'gpt-4o-mini',
    );

    this.logger.log('For fileStructureContent debug: ' + fileStructureContent);

    const ToJsonPrompt = prompts.convertTreeToJsonPrompt(fileStructureContent);

    // Try to build the virtual directory from the JSON structure.
    let successBuild = false;
    let fileStructureJsonContent = null;
    let retry = 0;
    const retryChances = 2;
    while (!successBuild) {
      if (retry > retryChances) {
        throw new Error(
          'Failed to build virtual directory after multiple attempts',
        );
      }
      fileStructureJsonContent = await context.model.chatSync(
        {
          content: ToJsonPrompt,
        },
        'gpt-4o-mini',
      );

      this.logger.log('fileStructureJsonContent: ' + fileStructureJsonContent);

      successBuild = context.buildVirtualDirectory(fileStructureJsonContent);
      retry += 1;
    }

    this.logger.log('fileStructureJsonContent success');
    this.logger.log('buildVirtualDirectory success');

    return {
      success: true,
      data: fileStructureJsonContent,
    };
  }
}
