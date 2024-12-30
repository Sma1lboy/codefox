export const prompts = {
  // TODO: return format we could change to
  /*
  [
    {
      file: 'package.json',
      reason: 'Add dependencies and scripts',
    }
  ]
  */
  /**
   * Identifies files requiring modification for backend configuration.
   * @param files - List of files in the backend directory.
   * @param backendRequirement - The specific backend requirements.
   * @param projectOverview - Project name and description.
   * @param backendCode - Backend implementation code.
   * @returns A prompt string for identifying files to modify.
   */
  identifyBackendFilesToModify: (
    files: string[],
    backendRequirement: string,
    projectOverview: string,
    backendCode: string[],
  ): string => {
    return `You are an expert backend developer tasked with ensuring the backend setup aligns with the project's needs. Analyze the provided files in the backend directory, the backend requirements, project overview and implementation code to identify files that need to be modified.
 
 ### Inputs:
 - Project Overview: 
 ${projectOverview}
 
 - Backend Requirements: 
 ${backendRequirement}
 
 - Backend Implementation:
 ${backendCode.join('\n')}
 
 - Existing Files in Backend Directory: 
 ${files.join(', ')}
 
 ### Instructions:
 1. Analyze the backend requirements and implementation code to determine what configuration files need to be updated
 2. Consider dependencies used in the implementation code when analyzing package.json
 3. Review environment variables referenced in the code for .env updates 
 4. Check TypeScript configurations needed based on the implementation
 5. IMPORTANT: Only select files from the provided "Existing Files" list - do not include files that don't exist
 6. For each file, verify it exists in the provided file list before including it
 7. If a file exists but is unnecessary or unrelated, exclude it
 
 ### Output Format:
 Provide ONLY an array of file names within <GENERATE> tags. All files must exist in the "Existing Files" list:
 
 <GENERATE>
 ["package.json", "tsconfig.json"]
 </GENERATE>
 
 ### Important Rules:
 1. All files in the output MUST exist in the "Existing Files" list
 2. Do not suggest creating new files
 3. Only include files that actually need modifications based on the backend requirements and implementation
 4. Output should be a simple string array, not an object`;
  },

  /**
   * Generates a prompt for modifying a specific backend file.
   * @param fileName - Name of file to modify
   * @param currentContent - Current file content
   * @param backendRequirement - Backend requirements
   * @param projectOverview - Project overview
   * @param backendCode - Backend implementation code
   * @returns A prompt string for file modification
   */
  generateFileModificationPrompt: (
    fileName: string,
    currentContent: string,
    backendRequirement: string,
    projectOverview: string,
    backendCode: string[],
  ): string => {
    return `You are an expert backend developer. Review and update the content of ${fileName} based on the project requirements and implementation.
 
 ### Project Overview
 ${projectOverview}
 
 ### Backend Requirements
 ${backendRequirement}
 
 ### Backend Implementation
 ${backendCode.join('\n')}
 
 ### Current File Content
 \`\`\`
 ${currentContent}
 \`\`\`
 
 ### Instructions:
 1. Review the current file content, backend requirements and implementation code
 2. For package.json:
   - Add all dependencies used in the implementation code
   - Update scripts needed for running the application
   - Maintain existing valid configurations
 3. For tsconfig.json:
   - Configure compiler options based on code requirements
   - Add necessary path mappings
   - Enable features used in implementation
 4. For .env:
   - Add all environment variables referenced in code
   - Provide appropriate default values
 5. For other files:
   - Make appropriate modifications based on implementation needs
   - Preserve important existing configurations
 6. Only make necessary changes - don't modify working code that doesn't need updates
 
 ### Output Format:
 Provide ONLY the complete updated file content within <GENERATE> tags:
 
 <GENERATE>
 // Updated content for ${fileName}
 </GENERATE>`;
  },
};
