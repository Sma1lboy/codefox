// import { BuildHandler, BuildResult } from 'src/build-system/types';
// import { BuilderContext } from 'src/build-system/context';
// import { prompts } from './prompt';
// import { Logger } from '@nestjs/common';
// import { removeCodeBlockFences } from 'src/build-system/utils/strings';
// import { chatSyncWithClocker } from 'src/build-system/utils/handler-helper';
// import {
//   MissingConfigurationError,
//   ModelUnavailableError,
//   ResponseParsingError,
// } from 'src/build-system/errors';

// export class UXSMDHandler implements BuildHandler<string> {
//   readonly id = 'op:UX:SMD';
//   private readonly logger = new Logger('UXSMDHandler');

//   async run(context: BuilderContext): Promise<BuildResult<string>> {
//     this.logger.log('Generating UXSMD...');

//     // Extract project data from the context
//     const projectName =
//       context.getGlobalContext('projectName') || 'Default Project Name';
//     const platform = context.getGlobalContext('platform') || 'Default Platform';
//     const prdContent = context.getNodeData(');

//     // Validate required data
//     if (!projectName || typeof projectName !== 'string') {
//       throw new MissingConfigurationError('Missing or invalid projectName.');
//     }
//     if (!platform || typeof platform !== 'string') {
//       throw new MissingConfigurationError('Missing or invalid platform.');
//     }
//     if (!prdContent || typeof prdContent !== 'string') {
//       throw new MissingConfigurationError('Missing or invalid PRD content.');
//     }

    // Generate the prompt dynamically
    // const prompt = prompts.generateUxsmdPrompt(projectName, platform);
//     // Generate the prompt dynamically
//     const prompt = prompts.generateUxsmdrompt(
//       projectName,
//       prdContent,
//       platform,
//     );

//     // Send the prompt to the LLM server and process the response

//     try {
//       // Generate UXSMD content using the language model
//       const uxsmdContent = await this.generateUXSMDFromLLM(context, prompt);

//       if (!uxsmdContent || uxsmdContent.trim() === '') {
//         this.logger.error('Generated UXSMD content is empty.');
//         throw new ResponseParsingError('Generated UXSMD content is empty.');
//       }

//       // Store the generated document in the context
//       context.setGlobalContext('uxsmdDocument', uxsmdContent);

//       this.logger.log('Successfully generated UXSMD content.');
//       return {
//         success: true,
//         data: removeCodeBlockFences(uxsmdContent),
//       };
//     } catch (error) {
//       throw new ResponseParsingError(
//         'Failed to generate UXSMD content:' + error,
//       );
//     }
//   }

//   private async generateUXSMDFromLLM(
//     context: BuilderContext,
//     prompt: string,
//   ): Promise<string> {
//     try {
//       const uxsmdContent = await chatSyncWithClocker(
//         context,
//         {
//           model: 'gpt-4o-mini',
//           messages: [{ content: prompt, role: 'system' }],
//         },
//         'generateUXSMDFromLLM',
//         this.id,
//       );
//       this.logger.log('Received full UXSMD content from LLM server.');
//       return uxsmdContent;
//     } catch (error) {
//       throw new ModelUnavailableError(
//         'Failed to generate UXSMD content:' + error,
//       );
//     }
//   }
// }
