export const generateFrontEndCodePrompt = (
  currentFile: string,
  dependencyFilePath: string,
): string => {
  return `You are an expert frontend developer. 
  Your task is to generate complete and production-ready React frontend code based on the provided inputs using typescript.
  The code should include all necessary files, folders, and logic to cover UI components, API integration, routing, and state management while ensuring scalability and maintainability.
  
  Based on following inputs:

   - Sitemap Structure: 
   - UX Datamap Documentation: 
   - Backend Requirement Documentation: 
   - Current File: ${currentFile}
   - dependencyFilePath: ${dependencyFilePath}
   - Dependency File Code: 

    ### Instructions and Rules:
        File Requirements:

        The generated file must fully implement the requirements defined in the sitemap and UX datamap documents.
        Include all necessary imports, state management, and interactions to ensure functionality (no placeholders import).
        If applicable, integrate hooks, APIs, or context from the provided dependencies.

    Code Standards:

        Use functional components and React hooks.
        Adhere to any styling guidelines defined in the dependency file (e.g., Tailwind CSS or CSS Modules).
        Use descriptive and meaningful names for variables, functions, and components.
        Ensure accessibility best practices, including aria attributes.

    Comments:

        Add comments describing the purpose of each major code block or function.
        Include placeholders for any additional features or data-fetching logic that may need integration later.

    Error Handling:

        Handle potential edge cases, such as loading, error states, and empty data.

    Output Completeness:

        The generated file must be functional and complete, ready to be added directly to the project.

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
