import { ProjectInitHandler } from './node/project-init';
import { BuildHandler } from './types';
import { PRDHandler } from './node/product-requirements-document/prd';
import { UXSitemapStructureHandler } from './node/ux-sitemap-structure';
import { UXDatamapHandler } from './node/ux-datamap';
import { UXSMDHandler } from './node/ux-sitemap-document/uxsmd';

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
      new UXDatamapHandler(),
      new UXSMDHandler(),
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
