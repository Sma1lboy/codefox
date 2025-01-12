import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { generateFileArchPrompt } from './prompt';
import { Logger } from '@nestjs/common';
import {
  extractJsonFromText,
  formatResponse,
  parseGenerateTag,
} from 'src/build-system/utils/strings';

export class FileArchGenerateHandler implements BuildHandler<string> {
  readonly id = 'op:FILE:ARCH';
  private readonly logger: Logger = new Logger('FileArchGenerateHandler');

  // TODO: adding page by page analysis
  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.logger.log('Generating File Architecture Document...');

    const fileStructure = context.getNodeData('op:FILE:STRUCT');
    // TODO: here should use datamap struct
    const datamapDoc = context.getNodeData('op:UX:DATAMAP:DOC');
    // TODO: adding page by page analysis

    if (!fileStructure || !datamapDoc) {
      return {
        success: false,
        error: new Error(
          'Missing required parameters: fileStructure or datamapDoc',
        ),
      };
    }

    const prompt = generateFileArchPrompt(
      JSON.stringify(fileStructure.jsonFileStructure, null, 2),
      JSON.stringify(datamapDoc, null, 2),
    );

    // fileArchContent generate
    let successBuild = false;
    let fileArchContent = null;
    let jsonData = null;
    let retry = 0;
    const retryChances = 2;

    // TODO: not ideal, should implement a better global retry mechanism
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
        fileArchContent = await context.model.chatSync({
          model: 'gpt-4o-mini',
          messages: [{ content: prompt, role: 'system' }],
        });
        this.logger.debug('File arch code generated and parsed successfully.');

        const tagContent = parseGenerateTag(fileArchContent);
        jsonData = extractJsonFromText(tagContent);

        if (jsonData == null) {
          retry += 1;
          this.logger.error('Extract Json From Text fail');
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
      data: formatResponse(fileArchContent),
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
