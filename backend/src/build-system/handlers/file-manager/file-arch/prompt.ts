export const generateFileArchPrompt = (): string => {
  return `Your task is to analyze the given project directory structure and create a detailed JSON object mapping file dependencies. The output JSON must be precisely formatted and wrapped in <GENERATE></GENERATE> tags.

### Instructions
1. **Analyze the Inputs**:
   - Use the directory structure to identify all files and folders.
   - Leverage the page-by-page analysis to understand the roles and interactions of different components and pages.
   - Determine the role of each file based on its path and the provided analysis (e.g., page, component, context, hook, styles).
   - Identify direct dependencies for each file by considering typical imports based on roles, naming conventions, and the provided analysis.
   
2. **Generate File Dependency JSON**:
   - For each file, list its direct dependencies as an array of relative paths in the \`dependsOn\` field.
   - Use relative paths for dependencies whenever possible. For example:
     - If a file \`index.tsx\` references a CSS file \`index.css\` in the same folder, the dependency should be listed as \`"./index.css"\`.
     - If a file references another file in its parent folder, use \`"../filename"\`.
     - Only use absolute paths (e.g., starting with \`src/\`) when no shorter relative path is available.
   - Include CSS/SCSS files as dependencies for any JavaScript or TypeScript files that reference them (e.g., through imports or implied usage).
   - Include files that have no dependencies with an empty \`dependsOn\` array.
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
    - Dependencies:
      Files with no dependencies must have "dependsOn": [].
      Every file except src/index.ts must appear in at least one dependsOn array.
    - Use relative paths for dependencies wherever possible (./filename for same-folder dependencies, ../filename for parent-folder dependencies).
    - Wrap the JSON output with \`<GENERATE></GENERATE>\` tags.

### Notes
- **CSS Dependencies**: Any file that relies on a CSS/SCSS module file (e.g., \`Header.module.css\`) must list it in the \`dependsOn\` array.
- **Use Relative Paths When Possible**: Ensure dependencies are listed using the shortest possible path (e.g., \`"./filename"\` for files in the same folder).
- **Dependency Inclusion Rule**: All files, except for \`src/index.ts\`, must be depended upon by at least one other file. This means they should appear in the \`dependsOn\` array of at least one other file.
- The \`dependsOn\` field should reflect logical dependencies inferred from both the directory structure and the page-by-page analysis.
- Use common project patterns to deduce dependencies (e.g., pages depend on components, contexts, hooks, and styles).
- Include all files in the output, even if they have no dependencies.

### Output
Return only the JSON object wrapped in \`<GENERATE></GENERATE>\` tags.`;
};
