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

Self check:
    1, Are you consider all the cases based on the sitemap doc? If not add new folder or file

This final result must be 100% complete. Will be directly use in the production

Output Format:

    Start with: "\`\`\`FolderStructure"
    Tree format:
        Include folder names with placeholder/example files inside.
        Add comments to describe the purpose of each file/folder.
    End with: "\`\`\`"
      `;
  },
};
