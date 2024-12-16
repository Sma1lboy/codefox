import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { generateFileArchPrompt } from './prompt';
import { Logger } from '@nestjs/common';
import { extractJsonFromMarkdown } from 'src/build-system/utils/strings';

export class FileArchGenerateHandler implements BuildHandler<string> {
  readonly id = 'op:FILE:ARCH';
  private readonly logger: Logger = new Logger('FileArchGenerateHandler');

  // TODO: adding page by page analysis
  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.logger.log('Generating File Architecture Document...');

    const fileStructure = context.getNodeData('op:FILE:STRUCT');
    // TODO: here should use datamap struct
    const dataMapStruct = context.getNodeData('op:UX:DATAMAP:DOC');
    // TODO: adding page by page analysis

    if (!fileStructure || !dataMapStruct) {
      return {
        success: false,
        error: new Error(
          'Missing required parameters: fileStructure or dataMapStruct',
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
        this.logger.error(
          'Failed to build virtual directory after multiple attempts',
        );
        return {
          success: false,
          error: new Error(
            'Failed to build virtual directory after multiple attempts',
          ),
        };
      }
      try {
        fileArchContent = await context.model.chatSync(
          {
            content: prompt,
          },
          'gpt-4o-mini',
        );

        // validation test
        jsonData = extractJsonFromMarkdown(fileArchContent);
        if (jsonData == null) {
          retry += 1;
          this.logger.error('Extract Json From Markdown fail');
          continue;
        }

        // Validate the extracted JSON data
        if (!this.validateJsonData(jsonData)) {
          retry += 1;
          this.logger.error('File architecture JSON validation failed');
          continue;
        }

        successBuild = true;
      } catch (error) {
        this.logger.error('Error during JSON extraction or validation', error);
        return {
          success: false,
          error: new Error('Error during JSON extraction or validation'),
        };
      }
    }

    this.logger.log('File architecture document generated successfully');
    return {
      success: true,
      data: fileArchContent,
    };
  }

  /**
   * Validate the structure and content of the JSON data.
   * @param jsonData The JSON data to validate.
   * @returns A boolean indicating whether the JSON data is valid.
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
