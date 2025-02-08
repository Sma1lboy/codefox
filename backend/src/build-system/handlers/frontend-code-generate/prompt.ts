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

export function generateFixPrompt(
  filePath: string,
  rawErrorText: string,
  dependenciesPath: string,
  originalContent: string,
): string {
  return `
  You are an expert in React and TypeScript. Your goal is to automatically fix errors in a given TypeScript React file while ensuring correctness, maintainability, and best practices.
**Instructions:**
1. **Understand the error from \`rawErrorText\`** and determine what's wrong.
2. **Analyze the dependencies** in \`dependenciesPath\` to ensure type compatibility.
3. **Modify the original code** in \`originalCode\` while preserving its logic.
4. **Ensure TypeScript type safety** and fix any possible runtime issues.
5. **Return only the fixed code and a concise explanation of the changes.**

**User Inputs:**
- \`fileName\`: The file in which the error occurred.
- \`rawErrorText\`: The error message received.
- \`dependenciesPath\`: The full path to the dependencies directory.
- \`originalCode\`: The actual code with the error.

**Expected Output:**
- Provide the **fixed code** without changing the structure unnecessarily.
- Ensure the code is TypeScript-safe and follows React best practices.
- Provide a **brief explanation** of the fixes and improvements.

The file Name:

  ${filePath}

The raw Error Text:
\`\`\`
${rawErrorText}
\`\`\`

The dependency file path is:
\`\`\`
${dependenciesPath}
\`\`\`

The file content is:
\`\`\`
${originalContent}
\`\`\`

Please fix the code so it compiles successfully. Return only the updated code wrapped in <GENERATE></GENERATE>tags.
  `;
}

export function generateFileOperationPrompt(): string {
  return `
  You are a senior developer fixing a TypeScript project. Analyze the error and choose appropriate file operations. Return a structured JSON object that contains the fix.

Available Tools:
1. WRITE - Modify/create files
2. RENAME - RENAME the file
3. READ - Read the file

**Instructions:**
1. **Understand the error from \`error\`** and determine what's wrong.
2. **Analyze the dependencies** in \`dependencies file path\` to ensure type compatibility.
3. **Modify the original code** in \`Current file Code\` while preserving its logic.
4. **Ensure TypeScript type safety** and fix any possible runtime issues.
5. Error Analysis:
   - Read the error message carefully
   - Identify error type (compilation/runtime/naming)
   - Check if error originates from current file or dependencies

6. Dependency Check:
   - Compare types/interfaces with dependencies file path provide by user.
   - Ensure all imports match actual exports
   - Verify type signatures align

7. Modification Rules:
   - Preserve original functionality
   - Maintain TypeScript strict mode compliance
   - Keep existing code style/conventions
   - Add type guards where necessary
   - Prefer generics over 'any'

8. File Operations:
   - Use RENAME only for extension issues (e.g., .js → .tsx)
   - Use WRITE for code/content changes
   - Use READ for not enough information so solve the issue

9. When User provide "Additional imported files" use this as to help you fix the error. Remeber only write other files code to current file when it is necessary

10. generate must include full code.


**Common Errors & Fixes**
    JSX file naming issue → Use the RENAME tool.
    TypeScript type error → Use the WRITE tool.
    Not assignable to parameter of type → Use the READ tool if you dont have enough information to fix.

**safety check**
1. Never delete files outside /src directory
3. Maintain existing export patterns
4. Verify all type references after changes

**Output format:**
Respond format in this json format:

{
  "fix": {
    "operations": [
      {
        "type": "WRITE"
      },
      {
        "type": "RENAME",
        "path": "src/new/path/here.tsx",
        "original_path": "src/old/path/here.ts"
      }
      {
        "type": "READ",
        "original_path": "src/the/path/read.tsx"
      }
    ],
    "generate": " Code here "
  }
}



**Good Tool using Example:**
Example Good WRITE Operation:
{
  "fix": {
    "operations": [
      {
        "type": "WRITE"
      }
    ],
    "generate": " Code here "
  }
}

Example Good RENAME Operation:
{
  "fix": {
    "operations": [
      {
        "type": "RENAME",
        "path": "src/utils/helpers.tsx",
        "original_path": "src/utils/helpers.js"
      }
    ],
    "generate": ""
  }
}

Example Good READ Operation:
{
  "fix": {
    "operations": [
      {
        "type": "READ",
        "original_path": "src/utils/helpers.tsx",
      }
      ... You can ask to read more then one file.
    ],
    "generate": ""
  }
}

**Important Note**
1.The output must be complete and strictly formatted.
2.DO NOT EXPLAIN OUTSIDE JSON.

  `;
}

export function generateCommonErrorPrompt(): string {
  return `
  1. JSX File Naming Issue → Use the RENAME Tool

Error Example:
  Cannot find namespace ''.ts
  Operator '<' cannot be applied to types 'boolean' and 'RegExp'

Fix:

    Rename .ts to .tsx since JSX syntax requires TypeScript support.

✅ Correct Fix Output:

<FIX>
  <OPERATIONS>
    <ACTION type="RENAME" path="src/components/Button.tsx">
      <ORIGINAL_PATH>src/components/Button.ts</ORIGINAL_PATH>
    </ACTION>
  </OPERATIONS>
  <GENERATE></GENERATE>
</FIX>

2. defined but never used Issue -> Use the WRITE Tool

Error example:
  'useEffect' is defined but never used.

Fix:
  Remove the defined but never used component from the import.

✅ Correct Fix Output:
    {                                                                                                                                                                                             
      "fix": {
        "operations": [
          {
            "type": "WRITE"
          }
        ],
        "generate": "Do the fix for the import and other part stay the same and put Full code here!"
      }
    }


3. Import error -> Use the WRITE Tool

Error example:
    Cannot find module './components/GlobalFooter' or its corresponding type declarations.

Fix:
    Read carefully about previous "dependency file Paths" use the path in the fix if applicable.

  `;
}
