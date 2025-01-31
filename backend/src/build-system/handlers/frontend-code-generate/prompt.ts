export const generateFrontEndCodePrompt = (
  currentFile: string,
  dependencyFilePath: string,
): string => {
  return `You are an expert frontend developer specializing in building scalable, maintainable, and production-ready React applications using TypeScript. 
  Your task: Generate complete and functional React frontend code based on the provided inputs. The output must include all essential files, folders, and logic for UI components, API integration, routing, and state management.
  Current File: ${currentFile}.

    ### Instructions and Rules:
      File Requirements:
        Implement all specifications defined in the sitemap and UX datamap documents.
        Ensure that the code includes necessary imports, state management, interactions, and API integrations without placeholders.
        Incorporate hooks, APIs, or context based on dependencies provide
        Use inline Tailwind CSS classes in TSX for all styling requirements. Avoid external .css files unless explicitly required by third-party libraries.
        For src/index.tsx, ensure it imports index.css for global styles or third-party integrations.

      Code Standards:
        Use React functional components and modern hooks (e.g., useState, useEffect, useContext).
        Adhere to styling guidelines (e.g., Tailwind CSS, CSS Modules) as described in dependency files.
        Use descriptive and meaningful names for all variables, functions, and components.
        Follow accessibility best practices, including proper aria attributes.
        When need to import from dependency file, use the user provide dependency file path.
        Do not include any unnecessary or redundant code.
        Do not assume any specific backend or API implementation.
        Do not asume any import or dependencies.
        Use only the dependencies provided below for imports. Ensure these imports are included correctly in the generated code wherever applicable.

      ### Dependencies:
      Below are the required dependency files to be included in the generated code.

      <dependency>
      File path: (dependency file code path)

      \`\`\`typescript
      dependency file content
      \`\`\`
      </dependency>


      Comments:
        Add comments for each major code block or function, describing its purpose and logic.
        Mark placeholders or sections where additional future integrations might be needed.

      Error Handling:
        Handle edge cases such as loading states, error states, and empty data gracefully.
        Include fallback UI components or error boundaries where applicable.

      Output Completeness:
          The generated file must be production-ready and include all necessary imports and dependencies.
          This final result must be 100% complete. Will be directly use in the production

      ### Output Format:       
        DO NOT include any code fences (no \`\`\`).
        Output your final code wrapped in <GENERATE> tags ONLY, like:

          <GENERATE>
          ...full code...
          </GENERATE>

  `;
};

export function generateCSSPrompt(
  fileName: string,
  directDependencies: string,
): string {
  return `
  You are an expert CSS developer. Generate valid, production-ready CSS for the file "${fileName}".

    ## Context
    - Sitemap Strucutrue: 
    - UX Datamap Documentation: 

    - Direct Dependencies (if any and may include references to other styles or partials):
    ${directDependencies}

    - Direct Dependencies Context:

  ## Rules & Guidelines
    1. **Do NOT** include any JavaScript or React code—only plain CSS.
    2. **Do NOT** wrap your output in code fences (\`\`\`).
    3. You may define classes, IDs, or any selectors you need, but **be sure** to keep it purely CSS.
    4. Ensure the output is well-structured, readable, and adheres to best practices (e.g., BEM if you prefer).
    5. Include comments for clarity if needed, but keep them concise.
  
  ## Output Format
    Please produce the complete CSS content in the format described:
    <GENERATE>
    /* Your CSS content here */
    </GENERATE>
  `;
}
