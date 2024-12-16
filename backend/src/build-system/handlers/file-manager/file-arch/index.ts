import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { generateFileArchPrompt } from './prompt';
import { Logger } from '@nestjs/common';
import { FileUtil } from 'src/build-system/utils/strings';

export class FileArchGenerateHandler implements BuildHandler {
  readonly id = 'op:FILE_ARCH::STATE:GENERATE';
  private readonly logger: Logger = new Logger('FileArchGenerateHandler');

  // TODO: adding page by page analysis
  async run(context: BuilderContext, args: unknown): Promise<BuildResult> {
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

    const prompt = generateFileArchPrompt(
      JSON.stringify(fileStructure, null, 2),
      JSON.stringify(dataMapStruct, null, 2),
    );

    // fileArchContent generate
    let successBuild = false;
    let fileArchContent = null;
    let jsonData = null;
    let retry = 0;
    const retryChances = 2;
    while (!successBuild) {
      if (retry > retryChances) {
        throw new Error(
          'Failed to build virtual directory after multiple attempts',
        );
      }

      fileArchContent = await context.model.chatSync(
        {
          content: prompt,
        },
        'gpt-4o-mini',
      );

      // validation test
      jsonData = FileUtil.extractJsonFromMarkdown(fileArchContent);
      if (jsonData == null) {
        retry += 1;
        this.logger.error('Extract Json From Markdown fail');
        continue;
      }

      if (!this.validateJsonData(jsonData)) {
        retry += 1;
        this.logger.error('FileArchGenerate validateJsonData fail');
        continue;
      }
      this.logger.log(jsonData);
      successBuild = true;
    }

    return {
      success: true,
      data: fileArchContent,
    };
  }

  /**
   * Validate the structure and content of the JSON data.
   * @param jsonData The JSON data to validate.
   * @throws Error if validation fails.
   */
  private validateJsonData(jsonData: {
    files: Record<string, { dependsOn: string[] }>;
  }): boolean {
    const validPathRegex = /^[a-zA-Z0-9_\-/.]+$/;

    for (const [file, details] of Object.entries(jsonData.files)) {
      // Validate the file path
      if (!validPathRegex.test(file)) {
        this.logger.error(`Invalid file path: ${file}`);
        return false;
      }

      // Validate dependencies
      for (const dependency of details.dependsOn) {
        if (!validPathRegex.test(dependency)) {
          this.logger.error(
            `Invalid dependency path "${dependency}" in file "${file}".`,
          );
          return false;
        }

        // Ensure no double slashes or trailing slashes
        if (dependency.includes('//') || dependency.endsWith('/')) {
          this.logger.error(
            `Malformed dependency path "${dependency}" in file "${file}".`,
          );
          return false;
        }
      }
    }
    return true;
  }
}
