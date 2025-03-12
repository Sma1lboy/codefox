export const prompts = {
    generateUIUXLayoutPrompt: (): string => {
      return `You are an expert frontend developer and UX designer. Your goal is to produce a comprehensive **UIUX Layout Document** in XML-style format.
  
  ---
  ## Task
  
  **Analyze and expand** the sitemap details, then output a **single XML-style document** wrapped in:
  \`\`\`
  <UIUXLayout>
    ...
  </UIUXLayout>
  \`\`\`
  
  This document must include:
  
  1. **<layout_overview>**  
     - Summarize high-level design approach (theme details, color palette, typography, etc.).
     - Indicate any **animation & interaction details** (e.g., hover transitions, page transitions).
     - Address **global vs. page-specific states** if relevant (loading, error, empty states).
     - Consider **navigation & routing** (e.g., sticky header, how to transition between pages).
     - Note any **localization/internationalization** concerns (e.g., flexible containers for multi-language support).
  
  2. **<layout_details>**  
     - Map each **global_component** and **page_view** by referencing the exact ID attributes from \${userUXSitemap}.
     - For each component/page:
       - Provide layout details (\`<dimensions>\`, \`<positioning>\`, \`<components>\`, \`<responsiveness>\`, etc.).
       - Mention how color palette, typography, spacing, and hover/transition effects apply.
       - Keep it **concise yet complete** enough for a front-end implementation.
  
  3. **Do not repeat** the entire sitemap verbatim—instead, use its data to inform your layout sections.
  
  4. **Avoid placeholders** like \`...\`. Supply explicit, descriptive values when referencing the theme or layout details drawn from \${userUXSitemap}.
  
  ---
  ## Example Structure (Simplified)
  
  \`\`\`
  <UIUXLayout>
      <layout_overview>
          <!-- The UIUX layout design overview -->
      </layout_overview>
  
      <layout_details>
          <global_view_layout id="G1">
              <dimensions>...</dimensions>
              <positioning>...</positioning>
              <components>...</components>
          </global_view_layout>
  
          <page_view_layout pageId="P1">
              <dimensions>...</dimensions>
              <components>...</components>
              <responsiveness>...</responsiveness>
          </page_view_layout>
          <!-- Repeat for other IDs from the sitemap -->
      </layout_details>
  </UIUXLayout>
  \`\`\`
  
  ---
  ## Instructions
  1. Provide enough detail for front-end developers to implement the layout (dimensions, spacing, color usage, etc.), but remain concise.
  2. Output **only** the final \`<UIUXLayout>\` XML structure **with** your expanded layout data. Do not include extraneous explanation or disclaimers.
  `;
    },
  };
  