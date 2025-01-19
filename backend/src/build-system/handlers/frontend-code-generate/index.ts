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
          let dependenciesContext = '';

          //gather the contents of each dependency into a single string.
          for (const dep of directDepsArray) {
            try {
              // Resolve against frontendPath to get the absolute path
              const resolvedDepPath = normalizePath(
                path.resolve(frontendPath, 'src', dep),
              );

              // Read the file. (may want to guard so only read certain file types.)
              const fileContent = await readFile(resolvedDepPath, 'utf-8');

              //just append a code:
              dependenciesContext += `\n\n[Dependency: ${dep}]\n\`\`\`\n${fileContent}\n\`\`\`\n`;
            } catch (readError) {
              // If the file doesn't exist or can't be read, log a warning.
              this.logger.warn(
                `Failed to read dependency "${dep}" for file "${file}": ${readError}`,
              );
            }
          }

          // Format for the prompt
          const directDependencies = directDepsArray.join('\n');

          this.logger.log(
            `Generating file in dependency order: ${currentFullFilePath}`,
          );
          this.logger.log(
            `2 Generating file in dependency order directDependencies: ${directDependencies}`,
          );

          let frontendCodePrompt = '';

          if (fileExtension === 'css') {
            frontendCodePrompt = generateCSSPrompt(
              sitemapStruct,
              uxDataMapDoc,
              file,
              directDependencies,
              dependenciesContext,
            );
          } else {
            // Generate the prompt
            frontendCodePrompt = generateFrontEndCodePrompt(
              sitemapStruct,
              uxDataMapDoc,
              backendRequirementDoc.overview,
              file,
              directDependencies,
              dependenciesContext,
            );
          }
          this.logger.log(
            'generate code prompt for frontendCodePrompt or css: ' +
              frontendCodePrompt,
          );

          this.logger.debug('Generated frontend code prompt.');

          let generatedCode = '';
          try {
            // Call the model
            const modelResponse = await context.model.chatSync(
              {
                content: frontendCodePrompt,
              },
              'gpt-4o-mini', // or whichever model you need
            );

            // Parse the output
            generatedCode = parseGenerateTag(modelResponse);

            this.logger.debug(
              'Frontend code generated and parsed successfully.',
            );
          } catch (error) {
            // Return error
            this.logger.error('Error during frontend code generation:', error);
            return {
              success: false,
              error: new Error('Failed to generate frontend code.'),
            };
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
