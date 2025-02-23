import { BuildHandler, BuildOpts, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { Logger } from '@nestjs/common';
import {
  parseGenerateTag,
  removeCodeBlockFences,
  extractJsonFromText,
  formatResponse,
} from 'src/build-system/utils/strings';
import { chatSyncWithClocker } from 'src/build-system/utils/handler-helper';
import {
  ResponseParsingError,
  MissingConfigurationError,
  InvalidParameterError,
  ModelUnavailableError,
} from 'src/build-system/errors';
import { UXSMDHandler } from '../../ux/sitemap-document';
import { UXDMDHandler } from '../../ux/datamap';
import { BuildNode, BuildNodeRequire } from 'src/build-system/hanlder-manager';
import { VirtualDirectory } from 'src/build-system/virtual-dir';
import {
  buildDependencyGraph,
  validateAgainstVirtualDirectory,
} from 'src/build-system/utils/file_generator_util';

export const prompts = {
  convertTreeToJsonPrompt: (): string => {
    return `You are a highly skilled developer. Your task is to convert the previous file and folder structure, currently represented in an ASCII tree format, into a JSON structure. The JSON structure must:
  
  - Represent all file paths in a flat list under the "Paths" array.
  - Each file path must be a relative path that begins exactly with "src/" (do not include any leading "/" or absolute paths).
  - Directories should not be included—only file paths.
  
  Output Format:
  Return a JSON object in the following format:
  Surround the JSON object with <GENERATE> tags.
  
  <GENERATE>
  {
    "Paths": [
      "src/full/path/to/file1.ext",
      "src/full/path/to/file2.ext",
      "src/another/path/to/file3.ext"
    ]
  }
  </GENERATE>
  
  Additional Rules:
  
  - Maintain the original directory structure but only return files in the JSON output.
  - Keep file names and paths exactly as they appear in the ASCII tree.
  - **Important**: Ensure that all file paths are relative and begin exactly with "src/". Do not output any paths that start with a leading "/".
  - Do not include comments or extra fields besides "Paths".
  - Return only the JSON structure (no explanations, no additional comments). This JSON will be used directly in the application.
  `;
  },

  generateCommonFileStructurePrompt: (
    projectName: string,
    sitemapDoc: string,
    dataAnalysisDoc: string,
    framework: string,
    projectPart: string,
  ): string => {
    let roleDescription = '';
    let includeSections = '';
    let excludeSections = '';
    let fileNamingGuidelines = '';

    switch (projectPart.toLowerCase()) {
      case 'frontend':
        roleDescription = 'an expert frontend developer';
        includeSections = `
          Folder Structure example:
            src: Main source code folder.
              contexts: Global state management.
              pages: Route-specific views. For Example: Home, Search, Playlist.
              index.tsx: Application entry point with routing configuration.
        `;
        excludeSections = `
          Do Not Include:
            Asset folders (e.g., images, icons, fonts).
            Test folders or files.
            Service folders unrelated to API logic.
            .css files.
        `;
        fileNamingGuidelines = `
          File and Folder Naming Guidelines:
            Must use .tsx extension for all files.
            Use meaningful and descriptive file names.
            Do NOT use page_view_* and global_view_* prefixes for folder or file names.
            For components, include an index.tsx file in each folder to simplify imports.
            Each component should have its own folder named after the component (e.g., Button/).
            Use index.tsx as the main file inside the component folder.
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
        throw new Error(
          'Invalid project part specified. Must be "frontend" or "backend".',
        );
    }

    return `You are ${roleDescription}. Your task is to generate a complete folder and file structure for the ${projectPart} of a project named "${projectName}". Include all necessary files and folders to cover the essential aspects while ensuring scalability and maintainability.
    
    Based on the following input:
    
     - Project name: ${projectName}
     - Sitemap Documentation (provided by user)
     - Data Analysis Doc: (provided by user)
    
    ### Instructions and Rules:
    
    Include:
    ${includeSections}
    
    ${fileNamingGuidelines}
    
    ${excludeSections}
    
    File Comments:
        Include comments describing the purpose of each file or folder to improve readability.
    
    Ask yourself:
        1. Are you considering all the cases based on the sitemap doc? If not, add new folder or file.
        2. Are you considering all the components/hooks/services/APIs/routes based on the sitemap doc? If not, add new folder or file.
    
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

@BuildNode()
@BuildNodeRequire([UXSMDHandler, UXDMDHandler])
export class FileStructureAndArchitectureHandler
  implements BuildHandler<string>
{
  readonly id = 'op:FILE:STRUCT_AND_ARCH';
  private readonly logger: Logger = new Logger(
    'FileStructureAndArchitectureHandler',
  );
  private virtualDir: VirtualDirectory;

  async run(
    context: BuilderContext,
    opts?: BuildOpts,
  ): Promise<BuildResult<string>> {
    // ======= Step 1: 生成文件结构文档 =======
    this.logger.log('Generating File Structure Document...');

    // 从上下文中获取项目名称、sitemap 以及 datamap 文档
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';
    const sitemapDoc = context.getNodeData(UXSMDHandler);
    const datamapDoc = context.getNodeData(UXDMDHandler);
    const projectPart = opts?.projectPart ?? 'frontend';
    const framework = context.getGlobalContext('framework') ?? 'react';

    // 校验必传参数
    try {
      this.validateInputs(sitemapDoc, datamapDoc, framework, projectPart);
    } catch (error) {
      return {
        success: false,
        error,
      };
    }

    // 构造生成文件结构的提示内容
    const fileStructPrompt = prompts.generateCommonFileStructurePrompt(
      projectName,
      sitemapDoc,
      datamapDoc,
      framework,
      projectPart,
    );
    const convertToJsonPrompt = prompts.convertTreeToJsonPrompt();

    const fileStructMessages = [
      {
        role: 'system' as const,
        content: fileStructPrompt,
      },
      {
        role: 'user' as const,
        content: `
          **Sitemap Documentation**
          ${sitemapDoc}
          `,
      },
      {
        role: 'user' as const,
        content: `
          **Data map Analysis Documentation:**
          ${datamapDoc}

          Now please generate tree folder structure.
         `,
      },
      {
        role: 'system' as const,
        content: convertToJsonPrompt,
      },
      {
        role: 'user' as const,
        content: `**Final Check:**
      Before returning the output, ensure the following:
      - The JSON structure is correctly formatted and wrapped in <GENERATE></GENERATE> tags.
      - File extensions and paths match those in the Directory Structure.
      - All files and dependencies are included, with relative paths used wherever possible.`,
      },
    ];

    let fileStructureContent: string;
    try {
      fileStructureContent = await chatSyncWithClocker(
        context,
        {
          model: context.defaultModel || 'gpt-4o-mini',
          messages: fileStructMessages,
        },
        'generateCommonFileStructure',
        this.id,
      );

      if (!fileStructureContent || fileStructureContent.trim() === '') {
        throw new ResponseParsingError(
          `Generated content is empty during op:FILE:STRUCT_AND_ARCH.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to generate file structure: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        error: new ResponseParsingError(
          `File structure generation failed. ${error.message}`,
        ),
      };
    }

    let fileStructureJsonContent = '';
    try {
      fileStructureJsonContent = parseGenerateTag(fileStructureContent);
    } catch (error) {
      return {
        success: false,
        error: new ResponseParsingError(
          `Failed to parse file Structure Json Content. ${error.message}`,
        ),
      };
    }

    this.logger.log('Building virtual directory from file structure...');
    try {
      const successBuild = context.buildVirtualDirectory(
        fileStructureJsonContent,
      );
      if (!successBuild) {
        this.logger.error(
          'Failed to build virtual directory.' + fileStructureJsonContent,
        );
        throw new ResponseParsingError('Failed to build virtual directory.');
      }
    } catch (error) {
      return {
        success: false,
        error: new ResponseParsingError(
          `Failed to build virtual directory. ${error.message}`,
        ),
      };
    }

    context.virtualDirectory.getAllFiles().forEach((file) => {
      this.logger.log(file);
    });

    this.logger.log('File Structure Document generated successfully.');

    this.logger.log('Generating File Architecture Document...');

    this.virtualDir = context.virtualDirectory;
    const fileStructure = removeCodeBlockFences(fileStructureContent);
    if (!fileStructure || !datamapDoc) {
      return {
        success: false,
        error: new InvalidParameterError(
          `Missing required parameters: fileStructure or datamapDoc, current fileStructure: ${!!fileStructure}, datamapDoc: ${!!datamapDoc}`,
        ),
      };
    }

    const fileArchPrompt = generateFileArchPrompt();

    let invalidFiles = 'none';
    let fileArchContent: string;

    while (invalidFiles) {
      const fileArchMessages = [
        {
          role: 'system' as const,
          content: fileArchPrompt,
        },
        {
          role: 'user' as const,
          content: `
          **Page-by-Page Analysis**
          The following is a detailed analysis of each page. Use this information to understand specific roles, interactions, and dependencies.

          ${datamapDoc}

          Next, I will provide the **Directory Structure** to help you understand the full project architecture.`,
        },
        {
          role: 'user' as const,
          content: `
          **Directory Structure**:
          The following is the project's directory structure. Use this to identify files and folders.

          ${fileStructure}

          Based on this structure and the analysis provided earlier, please generate the File Architecture JSON object. Ensure the output adheres to all rules and guidelines specified in the system prompt.`,
        },
        {
          role: 'user' as const,
          content: `**Final Check**
      Before returning the output, ensure the following:
      - The JSON structure is correctly formatted and wrapped in <GENERATE></GENERATE> tags.
      - File extensions and paths match those in the Directory Structure.
      - All files and dependencies are included.`,
        },

        {
          role: 'user' as const,
          content:
            "here is the invalid file, trying to fix it, if it's none, then you can ignore it: " +
            invalidFiles,
        },
      ];

      try {
        fileArchContent = await chatSyncWithClocker(
          context,
          {
            model: context.defaultModel || 'gpt-4o-mini',
            messages: fileArchMessages,
          },
          'generateFileArch',
          this.id,
        );
      } catch (error) {
        this.logger.error('Model is unavailable:' + error);
        return {
          success: false,
          error: new ModelUnavailableError('Model is unavailable:' + error),
        };
      }

      const tagContent = parseGenerateTag(fileArchContent);
      const jsonData = extractJsonFromText(tagContent);

      if (!jsonData) {
        this.logger.error('Failed to extract JSON from text');
        throw new ResponseParsingError('Failed to extract JSON from text.');
      }

      if (!this.validateJsonData(jsonData)) {
        this.logger.error('File architecture JSON validation failed.');
        throw new ResponseParsingError(
          'File architecture JSON validation failed.',
        );
      }

      const { nodes } = buildDependencyGraph(jsonData);
      invalidFiles = validateAgainstVirtualDirectory(nodes, this.virtualDir);
      if (invalidFiles) {
        this.logger.warn('arch json content', fileArchContent);
        this.logger.warn(
          'Validation against virtual directory failed. here is the invalid file, trying to fix it',
          invalidFiles,
        );
      }
    }

    this.logger.log('File architecture document generated successfully.');
    return {
      success: true,
      data: formatResponse(fileArchContent),
    };
  }

  private validateInputs(
    sitemapDoc: any,
    datamapDoc: any,
    framework: string,
    projectPart: string,
  ): void {
    if (!sitemapDoc || typeof sitemapDoc !== 'string') {
      throw new MissingConfigurationError('Missing or invalid sitemapDoc.');
    }
    if (!datamapDoc || typeof datamapDoc !== 'string') {
      throw new MissingConfigurationError('Missing or invalid datamapDoc.');
    }
    if (!framework || typeof framework !== 'string') {
      throw new MissingConfigurationError('Missing or invalid framework.');
    }
    if (!['frontend', 'backend'].includes(projectPart)) {
      throw new MissingConfigurationError(
        'Invalid projectPart. Must be either "frontend" or "backend".',
      );
    }
  }

  private validateJsonData(jsonData: {
    files: Record<string, { dependsOn: string[] }>;
  }): boolean {
    const validPathRegex = /^[a-zA-Z0-9_\-/.]+$/;

    for (const [file, details] of Object.entries(jsonData.files)) {
      if (!validPathRegex.test(file)) {
        this.logger.error(`Invalid file path: ${file}`);
        return false;
      }

      for (const dependency of details.dependsOn) {
        if (!validPathRegex.test(dependency)) {
          this.logger.error(
            `Invalid dependency path "${dependency}" in file "${file}".`,
          );
          return false;
        }

        if (dependency.includes('//') || dependency.endsWith('/')) {
          this.logger.error(
            `Malformed dependency path "${dependency}" in file "${file}".`,
          );
          return false;
        }
      }
    }
    return true;
  }
}
