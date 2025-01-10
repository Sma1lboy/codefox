import { ProjectInitHandler } from './handlers/project-init';
import { BuildHandler } from './types';
import { PRDHandler } from './handlers/product-manager/product-requirements-document/prd';
import { UXSitemapStructureHandler } from './handlers/ux/sitemap-structure';
import { UXDatamapHandler } from './handlers/ux/datamap';
import { UXSMDHandler } from './handlers/ux/sitemap-document';
import { FileStructureHandler } from './handlers/file-manager/file-structure';
import { FileArchGenerateHandler } from './handlers/file-manager/file-arch';
import { BackendCodeHandler } from './handlers/backend/code-generate';
import { DBSchemaHandler } from './handlers/database/schemas/schemas';
import { DatabaseRequirementHandler } from './handlers/database/requirements-document';
import { FileGeneratorHandler } from './handlers/file-manager/file-generate';
import { BackendRequirementHandler } from './handlers/backend/requirements-document';
import { BackendFileReviewHandler } from './handlers/backend/file-review/file-review';
import { Level2UXSitemapStructureHandler } from './handlers/ux/sitemap-structure/sms-page';
import { FrontendCodeHandler } from './handlers/frontend-code-generate';

/**
 * Manages the registration and retrieval of build handlers in the system
 * @class BuildHandlerManager
 * @description Singleton class responsible for:
 * - Maintaining a registry of all build handlers
 * - Providing access to specific handlers by ID
 * - Managing the lifecycle of built-in handlers
 * - Implementing the singleton pattern for global handler management
 */
export class BuildHandlerManager {
  private static instance: BuildHandlerManager;
  private handlers: Map<string, BuildHandler> = new Map();

  private constructor() {
    this.registerBuiltInHandlers();
  }

  private registerBuiltInHandlers() {
    const builtInHandlers: BuildHandler[] = [
      new ProjectInitHandler(),
      new PRDHandler(),
      new UXSitemapStructureHandler(),
      new Level2UXSitemapStructureHandler(),
      new UXDatamapHandler(),
      new UXSMDHandler(),
      new FileStructureHandler(),
      new FileArchGenerateHandler(),
      new BackendCodeHandler(),
      new DBSchemaHandler(),
      new DatabaseRequirementHandler(),
      new FileGeneratorHandler(),
      new BackendRequirementHandler(),
      new BackendFileReviewHandler(),
      new FrontendCodeHandler(),
    ];

    for (const handler of builtInHandlers) {
      this.handlers.set(handler.id, handler);
    }
  }

  static getInstance(): BuildHandlerManager {
    if (!BuildHandlerManager.instance) {
      BuildHandlerManager.instance = new BuildHandlerManager();
    }
    return BuildHandlerManager.instance;
  }

  getHandler(nodeId: string): BuildHandler | undefined {
    return this.handlers.get(nodeId);
  }

  clear(): void {
    this.handlers.clear();
    this.registerBuiltInHandlers();
  }
}
