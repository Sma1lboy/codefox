import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { generateFileArchPrompt } from './prompt';
import { Logger } from '@nestjs/common';
import {
  extractJsonFromText,
  formatResponse,
  parseGenerateTag,
} from 'src/build-system/utils/strings';
import { chatSyncWithClocker } from 'src/build-system/utils/handler-helper';
import {
  ResponseParsingError,
  InvalidParameterError,
  ModelUnavailableError,
} from 'src/build-system/errors';
import { VirtualDirectory } from 'src/build-system/virtual-dir';
import {
  buildDependencyGraph,
  validateAgainstVirtualDirectory,
} from 'src/build-system/utils/file_generator_util';
import { FileStructureHandler } from '../file-structure';
import { UXDMDHandler } from '../../ux/datamap';
import { BuildNode, BuildNodeRequire } from 'src/build-system/hanlder-manager';

@BuildNode()
@BuildNodeRequire([FileStructureHandler, UXDMDHandler])
export class FileFAHandler implements BuildHandler<string> {
  private readonly logger: Logger = new Logger('FileArchGenerateHandler');
  private virtualDir: VirtualDirectory;

  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.logger.log('Generating File Architecture Document...');

    this.virtualDir = context.virtualDirectory;

    const fileStructure = context.getNodeData(FileStructureHandler);
    const datamapDoc = context.getNodeData(UXDMDHandler);

    if (!fileStructure || !datamapDoc) {
      throw new InvalidParameterError(
        `Missing required parameters: fileStructure or datamapDoc, current fileStructure: ${!!fileStructure}, datamapDoc: ${!!datamapDoc}`,
      );
    }

    const prompt = generateFileArchPrompt();

    const messages = [
      {
        role: 'system' as const,
        content: prompt,
      },
      {
        role: 'user' as const,
        content: `
          **Page-by-Page Analysis**
          The following is a detailed analysis of each page. Use this information to understand specific roles, interactions, and dependencies.

          ${datamapDoc}

          Next, I'll provide the **Directory Structure**.`,
      },
      {
        role: 'user' as const,
        content: `
          **Directory Structure**:
          The following is the project's directory structure. Use this to identify files and folders.

          ${fileStructure}

          Please generate the full File Architecture JSON object now, ensuring adherence to all the rules.`,
      },
      {
        role: 'user' as const,
        content: `**Final Check:**
      - Ensure the JSON structure is correct.
      - Ensure all files and dependencies are included.`,
      },
    ];

    let fileArchContent: string;
    try {
      fileArchContent = await chatSyncWithClocker(
        context,
        {
          model: 'gpt-4o-mini',
          messages,
        },
        'generateFileArch',
        FileFAHandler.name,
      );
    } catch (error) {
      this.logger.error('Model is unavailable:' + error);
      throw new ModelUnavailableError('Model is unavailable:' + error);
    }

    const tagContent = parseGenerateTag(fileArchContent);
    const jsonData = extractJsonFromText(tagContent);

    if (!jsonData) {
      this.logger.error('Failed to extract JSON from text');
      throw new ResponseParsingError('Failed to extract JSON from text.');
    }

    if (!this.validateJsonData(jsonData)) {
      this.logger.error('File architecture JSON validation failed.');
      throw new ResponseParsingError(
        'File architecture JSON validation failed.',
      );
    }

    console.log(jsonData);
    // validate with virutual dir
    const { graph, nodes, fileInfos } = buildDependencyGraph(jsonData);
    if (!validateAgainstVirtualDirectory(nodes, this.virtualDir)) {
      this.logger.error('Validate Against Virtual Directory Fail !!!');
      throw new ResponseParsingError(
        'Failed to validate against virtualDirectory.',
      );
    }

    this.logger.log('File architecture document generated successfully.');
    return {
      success: true,
      data: formatResponse(fileArchContent),
    };
  }

  /**
   * Validates the structure and content of the JSON data.
   * @param jsonData The JSON data to validate.
   * @returns A boolean indicating whether the JSON data is valid.
   */
  private validateJsonData(jsonData: {
    files: Record<string, { dependsOn: string[] }>;
  }): boolean {
    const validPathRegex = /^[a-zA-Z0-9_\-/.]+$/;

    for (const [file, details] of Object.entries(jsonData.files)) {
      if (!validPathRegex.test(file)) {
        this.logger.error(`Invalid file path: ${file}`);
        return false;
      }

      for (const dependency of details.dependsOn) {
        if (!validPathRegex.test(dependency)) {
          this.logger.error(
            `Invalid dependency path "${dependency}" in file "${file}".`,
          );
          return false;
        }

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
