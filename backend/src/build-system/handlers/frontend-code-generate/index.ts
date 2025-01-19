import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { Logger } from '@nestjs/common';
import { batchChatSyncWithClock } from 'src/build-system/utils/handler-helper';
import {
  createFile,
  generateFilesDependencyWithLayers,
} from '../../utils/file_generator_util';
import { VirtualDirectory } from '../../virtual-dir';

import { UXSMSHandler } from '../ux/sitemap-structure';
import { UXDMDHandler } from '../ux/datamap';
import { BackendRequirementHandler } from '../backend/requirements-document';
import { FileFAHandler } from '../file-manager/file-arch';
import { BuildNode, BuildNodeRequire } from 'src/build-system/hanlder-manager';
import normalizePath from 'normalize-path';
import path from 'path';
import { readFile } from 'fs-extra';
import { generateCSSPrompt, generateFrontEndCodePrompt } from './prompt';
import { parseGenerateTag } from 'src/build-system/utils/strings';
import { ResponseParsingError } from 'src/build-system/errors';

/**
 * FrontendCodeHandler is responsible for generating the frontend codebase
 * based on the provided sitemap, data mapping documents, backend requirement documents,
 * frontendDependencyFile, frontendDependenciesContext, .
 */
@BuildNode()
@BuildNodeRequire([
  UXSMSHandler,
  UXDMDHandler,
  BackendRequirementHandler,
  FileFAHandler,
])
export class FrontendCodeHandler implements BuildHandler<string> {
  readonly logger: Logger = new Logger('FrontendCodeHandler');
  private virtualDir: VirtualDirectory;

  /**
   * Executes the handler to generate frontend code.
   * @param context - The builder context containing configuration and utilities.
   * @param args - The variadic arguments required for generating the frontend code.
   * @returns A BuildResult containing the generated code and related data.
   */
  async run(context: BuilderContext): Promise<BuildResult<string>> {
    this.logger.log('Generating Frontend Code...');

    // 1. Retrieve the necessary input from context
    const sitemapStruct = context.getNodeData(UXSMSHandler);
    const uxDataMapDoc = context.getNodeData(UXDMDHandler);
    const backendRequirementDoc = context.getNodeData(
      BackendRequirementHandler,
    );
    const fileArchDoc = context.getNodeData(FileFAHandler);

    // 2. Grab any globally stored context as needed
    this.virtualDir = context.virtualDirectory;
    const frontendPath = context.getGlobalContext('frontendPath');

    if (
      !sitemapStruct ||
      !uxDataMapDoc ||
      !backendRequirementDoc ||
      !fileArchDoc
    ) {
      this.logger.error(sitemapStruct);
      this.logger.error(uxDataMapDoc);
      this.logger.error(backendRequirementDoc);
      this.logger.error(fileArchDoc);
      throw new Error('Missing required parameters.');
    }

    // Dependency
    const { concurrencyLayers, fileInfos } =
      await generateFilesDependencyWithLayers(fileArchDoc, this.virtualDir);

    // 4. Process each "layer" in sequence; files in a layer in parallel
    for (const [layerIndex, layer] of concurrencyLayers.entries()) {
      this.logger.log(
        `\n==== Concurrency Layer #${layerIndex + 1} ====\nFiles: [${layer.join(
          ', ',
        )}]\n`,
      );

      await Promise.all(
        layer.map(async (file) => {
          this.logger.log(
            `Layer #${layerIndex + 1}, generating code for file: ${file}`,
          );

          // Resolve the absolute path where this file should be generated
          const currentFullFilePath = normalizePath(
            path.resolve(frontendPath, 'src', file),
          );

          // Gather direct dependencies
          const directDepsArray = fileInfos[file]?.dependsOn || [];
          const dependenciesContext = '';

          // Read each dependency and append to dependenciesContext
          let dependenciesText = '';
          for (const dep of directDepsArray) {
            try {
              const resolvedDepPath = normalizePath(
                path.resolve(frontendPath, 'src', dep),
              );
              const depContent = await readFile(resolvedDepPath, 'utf-8');
              dependenciesText += `\n\nprevious code **${dep}** is:\n\`\`\`typescript\n${depContent}\n\`\`\`\n`;
            } catch (err) {
              this.logger.warn(
                `Failed to read dependency "${dep}" for file "${file}": ${err}`,
              );
              throw new ResponseParsingError(
                `Error generating code for ${file}:`,
              );
            }
          }

          // 5. Build prompt text depending on file extension
          const fileExtension = path.extname(file);
          let frontendCodePrompt = '';
          if (fileExtension === '.css') {
            frontendCodePrompt = generateCSSPrompt(
              file,
              directDepsArray.join('\n'),
            );
          } else {
            // default: treat as e.g. .ts, .js, .vue, .jsx, etc.
            frontendCodePrompt = generateFrontEndCodePrompt(
              file,
              directDepsArray.join('\n'),
            );
          }
          this.logger.log(
            `Prompt for file "${file}":\n${frontendCodePrompt}\n`,
          );

          const messages = [
            {
              role: 'system' as const,
              content: frontendCodePrompt,
            },
            {
              role: 'user' as const,
              content: `This is the Sitemap Structure:
              ${sitemapStruct}
              
              Next will provide Sitemap Structure.`,
            },
            {
              role: 'user' as const,
              content: `This is the UX Datamap Documentation:
              ${uxDataMapDoc}
              
              Next will provide UX Datamap Documentation.`,
            },
            {
              role: 'user' as const,
              content: `This is the Backend Requirement Documentation:
              ${backendRequirementDoc}
              
              Next will provide Backend Requirement Documentation.`,
            },

            {
              role: 'user' as const,
              content: `Dependencies for ${file}:\n${dependenciesText}\n

            Now generate code for "${file}".`,
            },
          ];

          // 6. Call your Chat Model
          let generatedCode = '';
          try {
            const modelResponse = await batchChatSyncWithClock(
              context,
              'generate frontend code',
              FrontendCodeHandler.name,
              [
                {
                  model: 'gpt-4o',
                  messages,
                },
              ],
            );

            generatedCode = parseGenerateTag(modelResponse[0]);
          } catch (err) {
            this.logger.error(`Error generating code for ${file}:`, err);
            throw new ResponseParsingError(
              `Error generating code for ${file}:`,
            );
          }

          // 7. Write the file to the filesystem
          await createFile(currentFullFilePath, generatedCode);

          this.logger.log(
            `Layer #${layerIndex + 1}, completed generation for file: ${file}`,
          );
        }),
      );

      this.logger.log(
        `\n==== Finished concurrency layer #${layerIndex + 1} ====\n`,
      );
    }

    return {
      success: true,
      data: frontendPath,
      error: new Error('Frontend code generated and parsed successfully.'),
    };
  }
}
