import { BackendCodeHandler } from 'src/build-system/handlers/backend/code-generate';
import { BackendFileReviewHandler } from 'src/build-system/handlers/backend/file-review/file-review';
import { BackendRequirementHandler } from 'src/build-system/handlers/backend/requirements-document';
import { DBRequirementHandler } from 'src/build-system/handlers/database/requirements-document';
import { DBSchemaHandler } from 'src/build-system/handlers/database/schemas/schemas';
import { FileFAHandler } from 'src/build-system/handlers/file-manager/file-arch';
import { FileStructureHandler } from 'src/build-system/handlers/file-manager/file-structure';
import { FrontendCodeHandler } from 'src/build-system/handlers/frontend-code-generate';
import { PRDHandler } from 'src/build-system/handlers/product-manager/product-requirements-document/prd';
import { ProjectInitHandler } from 'src/build-system/handlers/project-init';
import { UXDMDHandler } from 'src/build-system/handlers/ux/datamap';
import { UXSMDHandler } from 'src/build-system/handlers/ux/sitemap-document';
import { UXSMSHandler } from 'src/build-system/handlers/ux/sitemap-structure';
import { UXSMSPageByPageHandler } from 'src/build-system/handlers/ux/sitemap-structure/sms-page';
import { BuildSequence } from 'src/build-system/types';
import { v4 as uuidv4 } from 'uuid';
import { CreateProjectInput } from './dto/project.input';

export function buildProjectSequenceByProject(
  input: CreateProjectInput,
): BuildSequence {
  const sequence: BuildSequence = {
    id: uuidv4(),
    version: '1.0.0',
    name: input.projectName,
    description: input.description,
    databaseType: input.databaseType,
    packages: input.packages,
    nodes: [
      {
        handler: ProjectInitHandler,
        name: 'Project Folders Setup',
      },
      {
        handler: PRDHandler,
        name: 'Project Requirements Document Node',
      },
      {
        handler: UXSMDHandler,
        name: 'UX Sitemap Document Node',
      },
      {
        handler: UXSMSHandler,
        name: 'UX Sitemap Structure Node',
      },
      {
        handler: UXDMDHandler,
        name: 'UX DataMap Document Node',
      },
      {
        handler: DBRequirementHandler,
        name: 'Database Requirements Node',
      },
      {
        handler: FileStructureHandler,
        name: 'File Structure Generation',
        options: {
          projectPart: 'frontend',
        },
      },
      {
        handler: UXSMSPageByPageHandler,
        name: 'Level 2 UX Sitemap Structure Node details',
      },
      {
        handler: DBSchemaHandler,
        name: 'Database Schemas Node',
      },
      {
        handler: FileFAHandler,
        name: 'File Arch',
      },
      {
        handler: BackendRequirementHandler,
        name: 'Backend Requirements Node',
      },
      {
        handler: BackendCodeHandler,
        name: 'Backend Code Generator Node',
      },
      {
        handler: BackendFileReviewHandler,
        name: 'Backend File Review Node',
      },
      {
        handler: FrontendCodeHandler,
        name: 'Frontend Code Generator Node',
      },
    ],
  };
  return sequence;
}

/**
 * Generates a project name prompt based on the provided description.
 */
export function generateProjectNamePrompt(description: string): string {
  return `You are a project name generator. Based on the following project description, generate a concise, memorable, and meaningful project name.

Input Description: ${description}

Requirements for the project name:
1. Must be 1-3 words maximum
2. Should be clear and professional
3. Avoid generic terms like "project" or "system"
4. Use camelCase or kebab-case format
5. Should reflect the core functionality or purpose
6. Must be unique and memorable
7. Should be easy to pronounce
8. Avoid acronyms unless they're very intuitive

Please respond ONLY with the project name, without any explanation or additional text.

Example inputs and outputs:
Description: "A task management system with real-time collaboration features"
Output: taskFlow

Description: "An AI-powered document analysis and extraction system"
Output: docMind

Description: "A microservice-based e-commerce platform with advanced inventory management"
Output: tradeCore`;
}
