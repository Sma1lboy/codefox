export const prompts = {
  generateUXSiteMapStructrePrompt: (
    projectName: string,
    platform: string,
  ): string => {
    return `You are an expert frontend develper and ux designer. Your job is to analyze and expand upon the details provided, generating a Full UX Sitemap Structure Document based on the following inputs:
       - Project name: ${projectName}
       - Platform: ${platform}
       - UX Sitemap Documentation: (Provided by the user next)

    Formatting & Output Guidelines:
    Output Requirements:
      Use plain text (no Markdown).
      Begin with <UXSitemap> and end with </UXSitemap>.
      Within <UXSitemap>, start with <global_view>, and generate multiple <page_view> blocks, one for each page.

      UX Sitemap Structure:
        The sitemap should be structured as follows:
          <UXSitemap>
            <!-- Global Shared UI Views -->
            <global_view>
                <global_component id="[id]">
                    G#. [Component Name]
                    Authentication Conditions: [Rules for visibility based on user authentication]
                    Elements:
                        - [List all UI elements in this component]
                          1. **Type** (Layout, Interactive, Display, Input, etc.)
                          2. **Purpose** (What does it do for the user or the interface?)
                          3. **States** (Possible UI states: Default, Hover, Clicked, Expanded, Loading, etc.)
                          4. **Interactions** (User actions or system responses: clicking, hovering, dragging, scrolling, etc.)
                </global_component>
            </global_view>

            <!-- Unique UI Pages -->
            <page_view id="[id]">
                P#. [Page Name]
                URL Path: /[path]
                Parent Page: [Parent page if nested, or "None" if top-level]
                Description: [Brief description of page purpose]
                Authentication Conditions: [Public/Private/Login Required]
                Core Components:
                    - C#.1. [Component Name]
                    - Definition: Core Components are **distinct UI elements** or **functional blocks** on the page that have a clear, identifiable role. Each component must include:
                      1. **Type** (Layout, Interactive, Display, Input, etc.)
                      2. **Purpose** (What does it do for the user or the interface?)
                      3. **States** (Possible UI states: Default, Hover, Clicked, Expanded, Loading, etc.)
                      4. **Interactions** (User actions or system responses: clicking, hovering, dragging, scrolling, etc.)
                Features & Functionality:
                    - Focus on how these features tie back to user stories, and which **Core Components** are used to achieve them
                    - F#.1. [Feature Name]
                        - Description: [Functionality Overview]
                        - User Stories: [Relevant user stories from PRD]
                        - Components Used: [Which UI elements power this feature?]
                #### Page-Specific User Flows:
                    Step-by-step sequences describing user interactions and system responses
                    Flow #. [Flow Name]
                        [Step 1]
                        [Step 2]
            </page_view>
          </UXSitemap>

1. **Goal**: Produce a complete UX Structure Map describing how each page/screen is laid out, including which global components are reused across pages.

2. **Global Components**:
   - Mark all reusable or site-wide elements with \`<global_component>\` tags and end tag </global_component>.
   - Provide a short but clear definition for each global component (e.g., Navigation Bar, Footer, etc.).
   - Explain how/why these components appear on multiple pages (if applicable).

3. **Page Definitions**:
   - Use \`<page_view>\` tags to define each individual page or screen from the Sitemap Documentation.
   - For each \`<page_view>\`, provide:
     - **Page id** a unique page id.
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
     1. One or more \`<global_component>\` blocks (if relevant).
     2. Multiple \`<page_view>\` blocks (one per page).
   - Each \`<global_component>\` or \`<page_view>\` should include all relevant fields as stated above.
   **Number** Goal Component in <global_component> tag sequentially (G1., G2., etc.).
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
    Are all global UI elements correctly categorized?
    Have you included all relevant user flows and navigation structures?
    Have you detailed each page's components, features, and flows completely?
    Is every page from the Sitemap Documentation represented in a \`<page_view>\` block?  
    Are all global components defined in \`<global_component>\` blocks?  
    Are user flows, interactions, and relevant content needs included?

Deliver a single XML-like document that strictly follows the structure above. Start with <UXSitemap> and close with </UXSitemap>, containing one <page_view> block per page.

  `;
  },
  generateLevel2UXSiteMapStructrePrompt: (
    projectName: string,
    platform: string,
  ): string => {
    return `
    You are an expert front-end developer and UX designer. We have two important inputs:
1. A “UX Sitemap Document” that outlines high-level pages, sections, and user flows.
2. A “UX Sitemap Structure” containing <page_gen> blocks for each main page/screen.

Your task is to produce a **page-by-page analysis** that enriches each <page_gen> block with additional detail about layout, components, styling, and interactions, based on these two inputs.

### Instructions
1. **Output Structure**

Each page **must** follow this format exactly, wrapped in \`<page_gen>\` tags:

<page_gen id="[id]"> 
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
       5. **Location** (Where on the page this component is placed)
       6. **Component Style**:
          - Colors & Theming:
          - Fonts & Typography:
          - Dimensions & Spacing:
          - Iconography:
          - Transitions/Animations:

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
</page_gen>

- For **Core Components**, use sequential numbering (C1.1, C1.2, etc.).
- For **Features**, use sequential numbering (F1.1, F1.2, etc.).
- Keep each \`<page_gen>\` labeled with a **unique** page ID and page number (P1, P2, etc.).

2. **Enhance** each page description to include more granular information such as:
   - **Layout**: Where each component (e.g. header, cards, sidebars) is placed on the page.
   - **Component Details**:
     - **Name** (e.g., “Search Bar,” “Recommended Playlists”)
     - **Type** (Layout, Interactive, Display, Input, etc.)
     - **Purpose** (What does it do for the user or the interface?)
     - **States** (Default, Hover, Clicked, Expanded, Loading, etc.)
     - **Interactions** (Click, Hover, Drag, etc.)
     - **Location** (e.g. “Header bar,” “Left sidebar,” “Main content section”)
     - **Component Style**: 
       - **Color & Theming**: Primary color, background/foreground contrasts, brand highlights, etc.
       - **Fonts & Typography**: Font family, size, weight, line-height if relevant.
       - **Dimensions & Spacing**: Approximate width/height (e.g., “a 300px-wide sidebar”), margins/paddings.
       - **Iconography**: If icons are used, note icon style or library (e.g., Material Icons, FontAwesome).
       - **Transitions/Animations**: If any hover or click animations are relevant.
   - **Features & Functionality**: Link features to the components implementing them.
   - **Page-Specific User Flows**: Step-by-step sequences describing user interactions and system responses.

3. **Process**
   - For each \`<page_gen>\` in the provided UX Sitemap Structure, also consult the “UX Sitemap Document” for higher-level context.
   - **Merge** or **add** any missing details, sub-pages, or user journeys not yet reflected in \`<page_gen>\`.
   - Provide enough detail that front-end developers have a clear blueprint of layout, styling, and user flows.

4. **Self-Check**
   - Does each \`<page_gen>\` block list **all** relevant components with location, style, and interactions?
   - Have you included all user flows from the UX Sitemap Document within the appropriate page?
   - Are roles, states, or restrictions noted (if any)?
   - Is the final detail sufficient for developers to build each page without ambiguity?

5. **Final Instructions**
- **Plain text only** (no Markdown).
- Begin the final document with \`<UXSitemap>\` and end with \`</UXSitemap>\`.
- Include one \`<page_gen>\` block per page. If you have global components, add them in \`<global_comp>\` blocks as per your chosen format.
- Do **not** omit any page or feature. The final result must be **100% complete** and consistent with
  `;
  },
};
