// import { isIntegrationTest } from 'src/common/utils';
// import { BuildSequence } from '../types';
// import { executeBuildSequence } from './utils';
// import { Logger } from '@nestjs/common';

// // TODO: adding integration flag
// (isIntegrationTest ? describe : describe.skip)(
//   'Sequence: PRD -> UXSD -> UXDD -> UXSS',
//   () => {
//     it('should execute the full sequence and log results to individual files', async () => {
//       const sequence: BuildSequence = {
//         id: 'test-backend-sequence',
//         version: '1.0.0',
//         name: 'Spotify-like Music Web',
//         description: 'Users can play music',
//         databaseType: 'SQLite',
//         steps: [
//           {
//             id: 'step-1',
//             name: 'Generate PRD',
//             nodes: [
//               {
//                 id: 'op:PRD',
//                 name: 'PRD Generation Node',
//               },
//             ],
//           },
//           {
//             id: 'step-2',
//             name: 'Generate UX Sitemap Document',
//             nodes: [
//               {
//                 id: 'op:UX:SMD',
//                 name: 'UX Sitemap Document Node',
//               },
//             ],
//           },
//           {
//             id: 'step-3',
//             name: 'Generate UX Sitemap Structure',
//             nodes: [
//               {
//                 id: 'op:UX:SMS',
//                 name: 'UX Sitemap Structure Node',
//               },
//             ],
//           },
//           {
//             id: 'step-4',
//             name: 'UX Data Map Document',
//             nodes: [
//               {
//                 id: 'op:UX:DATAMAP:DOC',
//                 name: 'UX Data Map Document node',
//               },
//             ],
//           },
//           {
//             id: 'step-5',
//             name: 'UX SMD LEVEL 2 Page Details',
//             nodes: [
//               {
//                 id: 'op:UX:SMS:LEVEL2',
//                 name: 'UX SMD LEVEL 2 Page Details Node',
//               },
//             ],
//           },
//         ],
//       };

//       try {
//         const result = await executeBuildSequence(
//           'test-generate-all-ux-part',
//           sequence,
//         );

//         Logger.log(
//           'Sequence completed successfully. Logs stored in:',
//           result.logFolderPath,
//         );

//         if (!result.success) {
//           throw result.error;
//         }
//       } catch (error) {
//         Logger.error('Error during sequence execution:', error);
//         throw error;
//       }
//     }, 600000);
//   },
// );
