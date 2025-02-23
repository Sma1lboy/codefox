export const generateFileArchPrompt = (): string => {
  return `Your task is to analyze the given project directory structure and create a detailed JSON object mapping file dependencies. The output JSON must be precisely formatted and wrapped in <GENERATE></GENERATE> tags.

### Instructions
1. **Analyze the Inputs**:
   - Use the directory structure to identify all files and folders.
   - Do not assume any additional files or paths. The structure must be based exclusively on the given list.
   - Leverage the page-by-page analysis to understand the roles and interactions of different components and pages.
   - Determine the role of each file based on its path and the provided analysis (e.g., page, component, context, hook, styles).
   - Identify direct dependencies for each file by considering typical imports based on roles, naming conventions, and the provided analysis.
   - For context files, ensure they are properly referenced in index.tsx or router.tsx, as contexts typically need to be provided at a high level in the application.
   
2. **Generate File Dependency JSON**:
   - Each file must be represented using its full path starting from src/.
   - Ensure dependencies are strictly limited to files in the "Paths" array.
   - Use absolute file paths from "Paths" for all "dependsOn" values.
      Do not use relative paths (./, ../).
      Every dependency must match exactly one of the files in "Paths".
   - Any file without dependencies should have "dependsOn": [].
   - For each file, list its direct dependencies as an array of relative paths in the \`dependsOn\` field.
   - Organize the output in a \`files\` object where keys are file paths, and values are their dependency objects.
   - For the router, remember to include all the page components as dependencies, as the router imports them to define the application routes.
   - For the src/index.tsx, remember to include router.ts.

3. **Output Requirements**:
   - The JSON object must strictly follow this structure:
     \`\`\`json
     <GENERATE>
     {
       "files": {
         "src/path/to/file1": {
           "dependsOn": ["path/to/dependency1", "path/to/dependency2"]
         },
         "src/path/to/file2": {
           "dependsOn": []
         }
       }
     }
     </GENERATE>
     \`\`\`
    - Keys: Every file must be represented with its full path, starting from src/.
    - Dependency Rules:
      All dependencies must exist in the "Paths" array.
      No inferred or assumed files should be added.
    - Wrap the JSON output with \`<GENERATE></GENERATE>\` tags.
### Notes
- The \`dependsOn\` field should reflect logical dependencies inferred from both the directory structure and the page-by-page analysis.
- Use common project patterns to deduce dependencies (e.g., pages depend on components, contexts, hooks, and styles).
- Include all files in the output, even if they have no dependencies.
- For context providers, ensure they are included as dependencies in either index.tsx or router.tsx to maintain proper context hierarchy in the React application.
- Include all files in the output, even if they have no dependencies.

### Output
Return only the JSON object wrapped in \`<GENERATE></GENERATE>\` tags.
Do not forget <GENERATE></GENERATE> tags.
`;
};
