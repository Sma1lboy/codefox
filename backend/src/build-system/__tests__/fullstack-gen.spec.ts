import { isIntegrationTest } from 'src/common/utils';
import { BuildSequence } from '../types';
import { ProjectInitHandler } from '../handlers/project-init';
import { PRDHandler } from '../handlers/product-manager/product-requirements-document/prd';
import { UXSMDHandler } from '../handlers/ux/sitemap-document';
import { UXSMSHandler } from '../handlers/ux/sitemap-structure';
import { DBRequirementHandler } from '../handlers/database/requirements-document';
import { UXDMDHandler } from '../handlers/ux/datamap';
import { BuilderContext } from '../context';
import { FrontendCodeHandler } from '../handlers/frontend-code-generate';
import { FileStructureAndArchitectureHandler } from '../handlers/file-manager/file-struct';
import { BackendRequirementHandler } from '../handlers/backend/requirements-document';

(isIntegrationTest ? describe : describe.skip)('Build Sequence Test', () => {
  it('should execute build sequence successfully', async () => {
    const sequence: BuildSequence = {
      id: 'test-backend-sequence',
      version: '1.0.0',
      name: 'Wrtie a Cool personal website',
      description: `Please create a personal ‘business card’ style website for a landscape photographer, emphasizing my specialty in capturing scenic imagery and showcasing my personal brand. The overall feel should be pure, natural, and artistic, drawing visitors in to explore my portfolio and inspiring them to share or recommend my work. Please incorporate the following:

Page Structure & Layout
Feature a large hero image of my best landscape shot with a concise, impactful tagline and a brief personal quote. Keep the layout clean with distinct sections—like an About Me intro, a gallery preview, ways to collaborate, and a contact or guestbook area—so the information is easy to digest. Go for a font style that’s tasteful and aligns with the artistic vibe of nature photography.
Color & Theme
Use a color palette that reflects the outdoors—soft greens or light blues as the main tones, paired with subtle grays or off-white as accents. This creates a calm, elegant feel that enhances the vibrancy of the photos and retains cohesion across the site.
Images & Design Details
Alongside the hero image, include smaller previews or a mini-gallery so visitors can quickly see more of my work. Each image should be high-resolution with pleasing framing or card-style layout. Keep the text content concise—introduce my shooting style and specialties, and integrate simple, tasteful icons for links to social platforms (like Instagram, 500px, or any other relevant channels).
Interaction & Mobile Experience
Use smooth, light animations (like fade-ins or slight image zooms) to make browsing feel modern without compromising load times. Ensure the site is fully responsive, so the layout, visuals, and any interactive elements adapt nicely on phones and tablets. Consider hover effects or quick-like icons on each photo, prompting visitors to engage.
Emotional Hook & Shareability
Maintain a warm, inviting tone throughout the copy, reflecting a theme of “experiencing the beauty of nature.” Clearly display social share or “spread the word” buttons, encouraging people to show off my portfolio. Finish with a strong call to action, such as “See More of My Work” or “Let’s Collaborate,” prompting direct inquiries or potential partnerships.
Please compile this into a fully-functional HTML, CSS, and JavaScript page that presents my photography skills professionally, fosters a desire to share, and gives a polished, artistic impression overall.`,
      databaseType: 'SQLite',
      model: 'gpt-4o-mini',
      projectSize: 'medium', // limit for fun
      nodes: [
        {
          handler: ProjectInitHandler,
          name: 'Project Folders Setup',
        },
        {
          handler: PRDHandler,
          name: 'Project Requirements Document Node',
        },
        {
          handler: UXSMDHandler,
          name: 'UX Sitemap Document Node',
        },
        {
          handler: UXSMSHandler,
          name: 'UX Sitemap Structure Node',
          // requires: ['op:UX:SMD'],
        },
        {
          handler: UXDMDHandler,
          name: 'UX DataMap Document Node',
        },
        {
          handler: FileStructureAndArchitectureHandler,
          name: 'File Structure and Architecture',
        },
        {
          handler: DBRequirementHandler,
          name: 'Database Requirements Node',
          // requires: ['op:UX:DATAMAP:DOC'],
        },
        {
          handler: BackendRequirementHandler,
          name: 'Backend Requirements Node',
          // requires: ['op:DATABASE_REQ', 'op:UX:DATAMAP:DOC', 'op:UX:SMD'],
        },
        {
          handler: FrontendCodeHandler,
          name: 'Frontend Code Generator Node',
        },
      ],
      packages: [],
    };
    const context = new BuilderContext(sequence, 'fullstack-code-gen');
    await context.execute();
  }, 2000000);
});
