export const generateFrontEndCodePrompt = (
  currentFile: string,
  dependencyFilePath: string,
): string => {
  return `Role: You are an expert frontend developer specializing in building scalable, maintainable, and production-ready React applications using TypeScript. 
  Task: Generate complete, type-safe, and maintainable React code.
  Current File: ${currentFile}.

    # Instructions and Rules:
      1. Implement Only One file: Implement only the given file.
      2. COMPLETE CODE: Your code will be part of the entire project, so please implement complete, reliable, reusable code snippets.
      3. Type Safe: Follow typscript standard. 
      4. Follow design: DONT CHANGE ANY DESIGN IN Document.
      5. CAREFULLY CHECK:
        Before importing a file, verify its existence.
        THAT YOU DONT MISSED ANY Internal Dependencies import.
        If missing, suggest an alternative or define mock data.
      6. Before using a external variable/module, make sure you import it first.
      7. Error Handling: Implement proper error handling in API calls and interactions with external modules.    
      8. Code Standards: Adhere to styling guidelines (e.g., Tailwind CSS, CSS Modules), and Use only Tailwind UI for styling, applying all styles via inline class names (className).
      9. Mock the response: if the API returns an empty or undefined value.
      10. Write EVERY CODE DETAIL, DON'T LEAVE TODO.

      ## Library:
        "react-router": "^6",
        "react": "^18",
        "@tailwindcss/vite": "^4.0.0"


      ## Output Format:       
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

export function generateFileOperationPrompt(currentFile: string): string {
  return `
  Role: You are a code-fixing assistant expert at typescript.
  Task: Based on the given error, generate the appropriate fix operation.
  Current File: ${currentFile}.

Available operations:
1. WRITE - Modify/create files
2. RENAME - RENAME the file
3. READ - Read the file

## Instructions:
1. Use only one operation.
2. Fix Only One file: Fix only the given file.
3. Fix every error: Try Fix every error in the given file.
4. Ask your self:
  why the errors occur?
  which lines of code are causing errors?
5. Internal Dependency Check:
   - Compare types/interfaces with dependencies file path provide by user.
   - Ensure all imports match actual exports
   - Verify type signatures align
6. Modification Rules:
   - Preserve original functionality
   - Maintain TypeScript strict mode compliance
   - Keep existing code style/conventions
   - Add type guards where necessary
   - Prefer generics over 'any'

7. File Operations:
   - Use RENAME only for extension issues (e.g., .ts → .tsx)
   - Use WRITE for code/content changes
   - Use READ for not enough information so solve the issue

8. Content must include full code.


**Common Errors & Fixes**
    JSX file naming issue → Use the RENAME tool.
    TypeScript type error → Use the WRITE tool.
    Not assignable to parameter of type → Use the READ tool if you dont have enough information to fix.

**Output format:**
To keep the structure consistent, other operations remain single-action:

1. Read File
If you need to inspect the file before fixing it:
{
  "fix": {
    "operation": {
      "type": "READ",
      "paths": ["src/path/to/file1.tsx", "src/path/to/file2.ts"]
    }
  }
}

2. Writing a Single File
If you found an issue and are generating a fix:
{
  "fix": {
    "operation": {
      "type": "WRITE",
      "content": "Fixed code here"
    }
  }
}

Renaming a Single File:
If a file needs to be renamed:
{
  "fix": {
    "operation": {
      "type": "RENAME",
      "path": "src/new/path/here.tsx",
      "original_path": "src/old/path/here.ts"
    }
  }
}
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

2. defined but never used Issue -> Use the WRITE Tool

Error example:
  'useEffect' is defined but never used.

Fix:
  Remove the defined but never used component from the import.


3. Import error -> Use the WRITE Tool

Error example:
    Cannot find module 'react-hook-form' or its corresponding type declarations.

Fix:
    1. Read carefully about previous "Internal dependency file Paths" use the path in the fix if applicable.
    2. if Internal dependency file didnt mention this then remove the import.

  `;
}
