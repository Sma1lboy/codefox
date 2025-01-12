import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { generateFileArchPrompt } from './prompt';
import { Logger } from '@nestjs/common';
import {
  extractJsonFromText,
  formatResponse,
  parseGenerateTag,
} from 'src/build-system/utils/strings';
import { NonRetryableError, RetryableError } from 'src/build-system/retry-handler';

export class FileArchGenerateHandler implements BuildHandler<string> {
  readonly id = 'op:FILE:ARCH';
  private readonly logger: Logger = new Logger('FileArchGenerateHandler');

  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.logger.log('Generating File Architecture Document...');

    const fileStructure = context.getNodeData('op:FILE:STRUCT');
    const datamapDoc = context.getNodeData('op:UX:DATAMAP:DOC');

    if (!fileStructure || !datamapDoc) {
      return {
        success: false,
        error: new NonRetryableError(
          'Missing required parameters: fileStructure or datamapDoc',
        ),
      };
    }

    const prompt = generateFileArchPrompt(
      JSON.stringify(fileStructure.jsonFileStructure, null, 2),
      JSON.stringify(datamapDoc, null, 2),
    );

    try {
      const fileArchContent = await context.model.chatSync({
        model: 'gpt-4o-mini',
        messages: [{ content: prompt, role: 'system' }],
      });

      const tagContent = parseGenerateTag(fileArchContent);
      const jsonData = extractJsonFromText(tagContent);

      if (jsonData == null) {
        this.logger.error('Failed to extract JSON from text');
        throw new RetryableError('Failed to extract JSON from text');
      }

      // Validate the extracted JSON data
      if (!this.validateJsonData(jsonData)) {
        this.logger.error('File architecture JSON validation failed');
        throw new RetryableError('File architecture JSON validation failed');
      }

      this.logger.log('File architecture document generated successfully');
      return {
        success: true,
        data: formatResponse(fileArchContent),
      };
    } catch (error) {
      if (error instanceof RetryableError) {
        this.logger.warn(`Retryable error encountered: ${error.message}`);
        // You can handle retry logic outside of this method
        return {
          success: false,
          error,
        };
      } else {
        this.logger.error('Non-retryable error encountered:', error);
        return {
          success: false,
          error: new NonRetryableError('Unexpected error during JSON processing'),
        };
      }
    }
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
