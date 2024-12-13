export const prompts = {
  generateFileStructurePrompt: (
    projectName: string,
    sitemapDoc: string,
    DataAnalysisDoc: string,
    framework: string,
  ): string => {
    return `You are an expert frontend developer. Your task is to generate a complete folder and file structure for the src directory of a frontend project. Include all necessary files and folders to cover UI, API calls, and local state management while ensuring scalability and maintainability. 
        Based on following input

         - Project name: ${projectName}
         - Sitemap Documentation: ${sitemapDoc}
         - Data Analysis Doc ${DataAnalysisDoc}

    ### Instructions and Rules:

Include:
    Folder Structure:
        components: Reusable UI elements grouped by category (e.g., common, layout, specific).
        contexts: Global state management (e.g., auth, theme, player).
        hooks: Custom hooks for data fetching and state management.
        pages: Route-specific views (e.g., Home, Search, Playlist).
        utils: Utility functions (e.g., constants, helpers, validators).
        api: Organized API logic (e.g., auth, music, user).
        router.ts: Central routing configuration.
        index.ts: Application entry point.

    Files:
        Include placeholder files in each folder to illustrate their purpose.
        Add example filenames for components, hooks, APIs, etc.

Do Not Include:
    Asset folders (e.g., images, icons, fonts).
    Test folders or files.
    Service folders unrelated to API logic.

File Naming Guidelines:
    Use meaningful and descriptive file names.
    For components, include an index.tsx file in each folder to simplify imports.
    Each component should have its own folder named after the component (e.g., Button/).
    Use index.tsx as the main file inside the component folder.
    Component-specific styles must be in index.css within the same folder as the component.
    
File Comments:
    Include comments describing the purpose of each file or folder to improve readability.

Ask yourself:
    1, Are you consider all the cases based on the sitemap doc? If not add new folder or file
    2, Are you consider all the components based on the sitemap doc? If not add new folder or file
    3, Are you consider all the hooks based on the sitemap doc? If not add new folder or file
    4, Are you consider all the api based on the sitemap doc? If not add new folder or file
    5, Are you consider all the pages based on the sitemap doc? If not add new folder or file

This final result must be 100% complete. Will be directly use in the production

Output Format:

    Start with: "\`\`\`FolderStructure"
    Tree format:
        Include folder names with placeholder files inside.
        Add comments to describe the purpose of each file/folder.
    End with: "\`\`\`"
      `;
  },
  convertTreeToJsonPrompt: (treeMarkdown: string): string => {
    return `You are a highly skilled developer. Your task is to convert the given file and folder structure, currently represented in an ASCII tree format, into a JSON structure. The JSON structure must:
    
    - Represent directories and files in a hierarchical manner.
    - Use objects with "type" and "name" keys.
      - For directories: 
        - "type": "directory"
        - "name": "<directory name>"
        - "children": [ ... ] (an array of files or directories)
      - For files:
        - "type": "file"
        - "name": "<filename.ext>"
    - Maintain the same nesting as the original ASCII tree.
    
    **Input Tree:**
    \`\`\`
    ${treeMarkdown}
    \`\`\`
    
    **Output Format:**
    Return a JSON object of the form:
    \`\`\`json
    {
      "type": "directory",
      "name": "<root directory name>",
      "children": [
        {
          "type": "directory",
          "name": "subDirName",
          "children": [
            {
              "type": "file",
              "name": "fileName.ext"
            }
          ]
        },
        {
          "type": "file",
          "name": "anotherFile.ext"
        }
      ]
    }
    \`\`\`
    
    **Additional Rules:**
    - Keep directory names and file names exactly as they appear (excluding trailing slashes).
    - For directories that appear like "common/", in the JSON just use "common" as the name.
    - Do not include comments or extra fields besides "type", "name", and "children".
    - The root node should correspond to the top-level directory in the tree.
    
    Return only the JSON structure (no explanations, no additional comments). This JSON will be used directly in the application.
    `;
  },
  generateCommonFileStructurePrompt: (
    projectName: string,
    sitemapDoc: string,
    dataAnalysisDoc: string,
    framework: string,
    projectPart: string,
  ): string => {
    // Define role and specific instructions based on project part
    let roleDescription = '';
    let includeSections = '';
    let excludeSections = '';
    let fileNamingGuidelines = '';

    switch (projectPart) {
      case 'frontend':
        roleDescription = 'an expert frontend developer';
        includeSections = `
          Folder Structure:
            components: Reusable UI elements grouped by category (e.g., common, layout, specific).
            contexts: Global state management (e.g., auth, theme, player).
            hooks: Custom hooks for data fetching and state management.
            pages: Route-specific views (e.g., Home, Search, Playlist).
            utils: Utility functions (e.g., constants, helpers, validators).
            api: Organized API logic (e.g., auth, music, user).
            router.ts: Central routing configuration.
            index.ts: Application entry point.

          Files:
            Include placeholder files in each folder to illustrate their purpose.
            Add example filenames for components, hooks, APIs, etc.
        `;
        excludeSections = `
          Do Not Include:
            Asset folders (e.g., images, icons, fonts).
            Test folders or files.
            Service folders unrelated to API logic.
        `;
        fileNamingGuidelines = `
          File Naming Guidelines:
            Use meaningful and descriptive file names.
            For components, include an index.tsx file in each folder to simplify imports.
            Each component should have its own folder named after the component (e.g., Button/).
            Use index.tsx as the main file inside the component folder.
            Component-specific styles must be in index.css within the same folder as the component.
        `;
        break;

      case 'backend':
        roleDescription = 'an expert backend developer';
        includeSections = `
          Folder Structure:
              controllers: Handle incoming requests and return responses.
              models: Define data schemas and interact with the database.
              routes: Define API endpoints and route requests to controllers.
              services: Business logic and interaction with external services.
              middleware: Custom middleware for request processing (e.g., authentication, logging).
              utils: Utility functions and helpers.
              config: Configuration files (e.g., database connection, environment variables).
              tests: Unit and integration tests.
              app.js/server.js: Application entry point.
        `;
        excludeSections = `
          Do Not Include:
              Frontend-specific folders (e.g., components, contexts).
              Asset folders (e.g., images, icons, fonts).
        `;
        fileNamingGuidelines = `
          File Naming Guidelines:
              Use meaningful and descriptive file names.
              Controllers should be named after their resource (e.g., userController.js).
              Models should represent data entities (e.g., User.js).
              Routes should be grouped by resource (e.g., userRoutes.js).
              Use consistent naming conventions (e.g., camelCase or snake_case) throughout the project.
        `;
        break;

      default:
        throw new Error('Invalid project part specified.');
    }

    return `You are ${roleDescription}. Your task is to generate a complete folder and file structure for the ${projectPart} of a project named "${projectName}". Include all necessary files and folders to cover the essential aspects while ensuring scalability and maintainability.
    
  Based on the following input:
  
   - Project name: ${projectName}
   - Sitemap Documentation: ${sitemapDoc}
   - Data Analysis Doc: ${dataAnalysisDoc}
  
  ### Instructions and Rules:
  
  Include:
  ${includeSections}
  
  ${fileNamingGuidelines}
  
  ${excludeSections}
  
  File Comments:
      Include comments describing the purpose of each file or folder to improve readability.
  
  Ask yourself:
      1. Are you considering all the cases based on the sitemap doc? If not, add new folder or file.
      2. Are you considering all the components based on the sitemap doc? If not, add new folder or file.
      3. Are you considering all the hooks/services based on the sitemap doc? If not, add new folder or file.
      4. Are you considering all the APIs/routes based on the sitemap doc? If not, add new folder or file.
      5. Are you considering all the pages/controllers based on the sitemap doc? If not, add new folder or file.
  
  This final result must be 100% complete and ready for direct use in production.
  
  Output Format:

      Start with: "\`\`\`FolderStructure"
      Tree format:
          Include folder names with placeholder files inside.
          Add comments to describe the purpose of each file/folder.
      End with: "\`\`\`"
  `;
  },
};
