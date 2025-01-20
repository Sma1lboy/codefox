export const generateFileArchPrompt = (
  fileStructure: string,
  datamapDoc: string,
): string => {
  return `You are a File Architecture Analyzer. Your task is to analyze the given project directory structure and the detailed page-by-page analysis, then output a JSON object detailing the file dependencies. The output JSON must be wrapped in <GENERATE></GENERATE> tags.

### Directory Structure Input
The following is the project's directory structure. Use this to identify files and folders.

\`\`\`
${fileStructure}
\`\`\`

### Page-by-Page Analysis Input
The following is a detailed analysis of each page. Use this information to understand specific roles, interactions, and dependencies.

\`\`\`
${datamapDoc}
\`\`\`

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
    - Keys in the files object must be file paths starting with src/.
    - Use relative paths for dependencies wherever possible (./filename for same-folder dependencies, ../filename for parent-folder dependencies).
    - Wrap the JSON output with \`<GENERATE></GENERATE>\` tags.

### Notes
- **CSS Dependencies**: Any file that relies on a CSS/SCSS module file (e.g., \`Header.module.css\`) must list it in the \`dependsOn\` array.
- **Use Relative Paths When Possible**: Ensure dependencies are listed using the shortest possible path (e.g., \`"./filename"\` for files in the same folder).
- **Dependency Inclusion Rule**: All files, except for \`src/index.ts\`, must be depended upon by at least one other file. This means they should appear in the \`dependsOn\` array of at least one other file.
- The \`dependsOn\` field should reflect logical dependencies inferred from both the directory structure and the page-by-page analysis.
- Use common project patterns to deduce dependencies (e.g., pages depend on components, contexts, hooks, and styles).
- Include all files in the output, even if they have no dependencies.
- Ensure the JSON output is properly formatted and wrapped with \`<GENERATE></GENERATE>\` tags.

### Output
Return only the JSON object wrapped in \`<GENERATE></GENERATE>\` tags.`;
};
