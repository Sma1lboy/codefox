import { ProjectInitHandler } from './node/project-init';
import { BuildHandler } from './types';

export class BuildHandlerManager {
  private static instance: BuildHandlerManager;
  private handlers: Map<string, BuildHandler> = new Map();

  private constructor() {
    this.registerBuiltInHandlers();
  }

  private registerBuiltInHandlers() {
    const builtInHandlers: BuildHandler[] = [new ProjectInitHandler()];

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
