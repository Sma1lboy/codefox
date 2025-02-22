export const generateFileArchPrompt = (): string => {
  return `Your task is to analyze the given project directory structure and create a detailed JSON object mapping file dependencies. The output JSON must be precisely formatted and wrapped in <GENERATE></GENERATE> tags.

### Instructions
1. Analyze the Inputs:
   - Use the directory structure to identify all files and folders.
   - Do not assume any additional files or paths. The structure must be based exclusively on the given list.
   - Leverage the page-by-page analysis to understand the roles and interactions of different components and pages.
   - Determine the role of each file based on its path and the provided analysis (e.g., page, component, context, hook, styles).
   - Identify direct dependencies for each file by considering typical imports based on roles, naming conventions, and the provided analysis.
   
2. Generate File Dependency JSON:
   - Each file must be represented using its full path starting from src/.
   - Ensure dependencies are strictly limited to files in the "Paths" array.
   - Dependencies must only include files explicitly listed in the Paths array.
   - Dependencies should be mapped using absolute paths starting from src/. Relative imports (./, ../) must not be used.
   - Each file must include a dependsOn field listing only its direct dependencies.
   - If a file has no dependencies, set "dependsOn": [].

3. Special Cases:

    Router Handling:
        The file src/router.ts must include all page components from src/pages/ in its dependsOn field.
    Entry Point (src/index.tsx):
        Must include src/router.ts as a dependency.
    ShadCN UI Components:
        Assume all those is in Path the following UI components are available:
        ["accordion", "alert", "alert-dialog", "aspect-ratio", "avatar", "badge", "breadcrumb", "button", "calendar", "card", "carousel", "chart", "checkbox", "collapsible", "command", "context-menu", "dialog", "drawer", "dropdown-menu", "form", "hover-card", "input", "input-otp", "label", "menubar", "navigation-menu", "pagination", "popover", "progress", "radio-group", "resizable", "scroll-area", "select", "separator", "sheet", "sidebar", "skeleton", "slider", "sonner", "switch", "table", "tabs", "textarea", "toast", "toggle", "toggle-group", "tooltip"]
    Any dependencies on these components must be written in the format:
      "@/components/ui/{component}.tsx"
    Example: If a file depends on "button", it should be:
      "dependsOn": ["@/components/ui/button.tsx"]
    Ensure all ShadCN UI components are explicitly listed in dependencies.

4. Output Requirements:
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

### Output
Return only the JSON object wrapped in \`<GENERATE></GENERATE>\` tags.
Do not forget <GENERATE></GENERATE> tags.
`;
};
