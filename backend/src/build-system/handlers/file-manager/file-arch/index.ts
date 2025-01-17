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
import { UXDatamapHandler } from '../../ux/datamap';
import { BuildNode, BuildNodeRequire } from 'src/build-system/hanlder-manager';

@BuildNode()
@BuildNodeRequire([FileStructureHandler, UXDatamapHandler])
export class FileArchGenerateHandler implements BuildHandler<string> {
  private readonly logger: Logger = new Logger('FileArchGenerateHandler');
  private virtualDir: VirtualDirectory;

  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.logger.log('Generating File Architecture Document...');

    this.virtualDir = context.virtualDirectory;

    const fileStructure = context.getNodeData(FileStructureHandler);
    const datamapDoc = context.getNodeData(UXDatamapHandler);

    if (!fileStructure || !datamapDoc) {
      Logger.error(fileStructure);
      Logger.error(datamapDoc);
      throw new InvalidParameterError(
        'Missing required parameters: fileStructure or datamapDoc.',
      );
    }

    const prompt = generateFileArchPrompt(
      JSON.stringify(fileStructure.jsonFileStructure, null, 2),
      JSON.stringify(datamapDoc, null, 2),
    );

    let fileArchContent: string;
    try {
      fileArchContent = await chatSyncWithClocker(
        context,
        {
          model: 'gpt-4o-mini',
          messages: [{ content: prompt, role: 'system' }],
        },
        'generateFileArch',
        FileArchGenerateHandler.name,
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
