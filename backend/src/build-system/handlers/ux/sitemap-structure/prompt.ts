export const prompts = {
  generateUXSiteMapStructrePrompt: (
    projectName: string,
    platform: string,
  ): string => {
    return `You are an expert frontend develper and ux designer. Your job is to analyze and expand upon the details provided, generating a Full UX Sitemap Document based on the following inputs:
       - Project name: ${projectName}
       - Platform: ${platform}
       - Product Requirements Document: (Provided by the user next)
       - Goal: MVP (Minimum Viable Product)

    Follow these rules as a guide to ensure clarity and completeness in your UX Sitemap Document.
   Output Requirements:
    Use plain text (no Markdown).
    Begin with <UXSitemap> and end with </UXSitemap>.
    Within <UXSitemap>, start with <global_comp>, and generate multiple <gen_page> blocks, one for each page.
    Each <gen_page> must follow this structure exactly:

<gen_page>
P#. [Page Name]
    URL Path: /[path]
    Description: [Brief description of page purpose]
    Parent Page: [Parent page if nested, or "None" if top-level]
    Access Level: [e.g., Public/Private/Admin]

#### Core Components
    C#.1. [Component Name]
    - Definition: Core Components are **distinct UI elements** or **functional blocks** on the page that have a clear, identifiable role. Each component must include:
       1. **Type** (Layout, Interactive, Display, Input, etc.)
       2. **Purpose** (What does it do for the user or the interface?)
       3. **States** (Possible UI states: Default, Hover, Clicked, Expanded, Loading, etc.)
       4. **Interactions** (User actions or system responses: clicking, hovering, dragging, scrolling, etc.)

#### Features & Functionality
    - Focus on how these features tie back to user stories, and which **Core Components** are used to achieve them
    F#.1. [Feature Name]
        Description: [Brief feature description]
        User Stories: [Related user stories from PRD]
        Components Used: [Which components implement this feature?]

#### Page-Specific User Flows
    Step-by-step sequences describing user interactions and system responses
    Flow #. [Flow Name]
        [Step 1]
        [Step 2]
</gen_page>

1. **Goal**: Produce a complete UX Structure Map describing how each page/screen is laid out, including which global components are reused across pages.

2. **Global Components**:
   - Mark all reusable or site-wide elements with \`<global_comp>\` tags and end tag </global_comp>.
   - Provide a short but clear definition for each global component (e.g., Navigation Bar, Footer, etc.).
   - Explain how/why these components appear on multiple pages (if applicable).

3. **Page Definitions**:
   - Use \`<page_gen>\` tags to define each individual page or screen from the Sitemap Documentation.
   - For each \`<page_gen>\`, provide:
     - **Page name** (P#).  
     - **URL Path**: The route or path used to access this page.  
     - **Description**: Explain the purpose of the page, the users goal, and how it supports the user journey.  
     - **Core Elements**: List and describe the UI elements on this page (headers, buttons, sidebars, etc.).  
       - Explain their states and interactions.  
       - Reference **global components** (if used) plus any page-specific components.  
     - **Content Display**: What information is shown, and why is it essential?  
     - **Navigation and Routes**: Which routes lead here? Which links or buttons lead out?  
     - **Restrictions**: Note if login is required, or if only certain user roles can access.

4. **Focus on Detail**:
   - Provide a component-level breakdown for each pages layout and user interactions.
   - Address all features from the Sitemap Documentation; confirm no item is missed.
   - Make sure each pages structure is thorough enough for front-end implementation.

5. **Consider**:
   - User goals on each page.  
   - The user journey and how each page supports it.  
   - The purpose of each element (why it exists, how it helps the user).  
   - The presence of dynamic or personalized content.

  6. **Output Format**:
   - Your reply must begin with: <UXSitemapStructre> and end with </UXSitemapStructre> (plain text, no Markdown headings).
   - Inside, you must include:
     1. One or more \`<global_comp>\` blocks (if relevant).
     2. Multiple \`<page_gen>\` blocks (one per page).
   - Each \`<global_comp>\` or \`<page_gen>\` should include all relevant fields as stated above.
   **Number** Goal Component in <global_comp> tag sequentially (G1., G2., etc.).
   **Number** pages sequentially (P1., P2., etc.).
   **Number** each component and feature sequentially within that page (C1.1, C1.2, F1.1, F1.2, etc.).
    Thoroughly parse the PRD to include:
      - **All** pages.
      - **All** features, functionalities, user stories, and flows.
      - **All** major/minor navigation and user journeys.

Sitemap Coverage

    Comprehensive Analysis:
        Capture all features, functionalities, and user stories.
        Represent all primary and secondary user flows.

    Page & Navigation Structure:
        Identify all main and nested pages.
        Ensure clear parent-child relationships.

    Detailed User Journeys:
        Provide step-by-step navigational flows unique to each page.

    Thorough Coverage:
        Verify every requirement, global UI element, unique UI, and user expectation from the PRD is addressed.
        No user flow or screen should be missing.

Self-Check Before Submitting

    Have you accounted for all sitemap details?
    Have you included all major and minor pages/screens?
    Have you detailed each page's components, features, and flows completely?
    Is every page from the Sitemap Documentation represented in a \`<page_gen>\` block?  
    Are all global components defined in \`<global_comp>\` blocks?  
    Are user flows, interactions, and relevant content needs included?

Deliver a single XML-like document that strictly follows the structure above. Start with <UXSitemap> and close with </UXSitemap>, containing one <gen_page> block per page.

  `;
  },
  generateLevel2UXSiteMapStructrePrompt: (
    projectName: string,
    UXStructure: string,
    sitemapDoc: string,
    platform: string,
  ): string => {
    return `You are an expert UX Designer. 
    Your task is to analyze and improve a specific part of a page in the provided UX Structure Document.
    The goal is to refine the design, layout, and interaction to ensure a seamless user experience and facilitate frontend implementation.
    The output should address all aspects of user interaction, content layout, based on the following inputs:
  
         - Project name: ${projectName}
         - Sitemap Documentation: ${sitemapDoc}
         - UX Structure document: ${UXStructure}
         - Platform: ${platform}
  
  Follow these guidelines to analyze requirements from a UX perspective:
  
  ### Instructions and Rules:
  
  1, Analyze the Target Section:
      Focus on the specific part of the page provided in the UX Structure document.
      Identify ways to enhance its layout, interactions, and functionality.
  2, Improve UX Details:
      Add clarity to component placement and hierarchy.
      Specify interactions, behaviors, and dynamic content updates.
      Ensure the section aligns with user goals and their journey.
  3, You need to identify and define every page/screen required for the application.
  4, Detailed Breakdown for Each Page/Screen:
    Page Purpose: Clearly state the user goal for the page.
    Core Elements:
        List all components (e.g., headers, buttons, sidebars) and explain their role on the page.
        Include specific interactions and behaviors for each element.
    Content Display:
        Identify the information that needs to be visible on the page and why it’s essential for the user.
    Navigation and Routes:
        Specify all frontend routes required to navigate to this page.
        Include links or actions that lead to other pages or states.
    Restrictions:
        Note any restrictions or conditions for accessing the page (e.g., login required, specific user roles).

  2. **Global Components**:
   - Mark all reusable or site-wide elements with \`<global_comp>\` tags.
   - Provide a short but clear definition for each global component (e.g., Navigation Bar, Footer, etc.).
   - Explain how/why these components appear on multiple pages (if applicable).

  5, Focus on Detail:
    Provide a component-level breakdown for each page, including layouts.
    Explain how the design supports user goals and aligns with their journey.

  6. For each page/screen in the sitemap:
     - How the block should be place on the view?
     - What information does the user need to see?
     - What elements should be on the page?
     - What are all the routes require for the frontend?
     - What dynamic content needs to be displayed?
     - What are the restriction for the page?
  
  7. Consider:
     - User goals on each page
     - User journy
     - Element purposes
     - Content that needs to be displayed

  Your reply must start with: "\`\`\`UXStructureMap" and end with "\`\`\`". 

  Focus on describing the UX Structure from a user experience perspective. For each page:
  1. What element appear on each page and why
  2. What information needs to be displayed and why
  3. How the element supports user goals

  Make sure is 100% completed. It will be directly be use in development.
  `;
  },
};
