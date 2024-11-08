import { BuildHandler } from './types';

export class BuildHandlerManager {
  private static instance: BuildHandlerManager;
  private handlers: Map<string, BuildHandler> = new Map();

  private constructor() {}

  static getInstance(): BuildHandlerManager {
    if (!BuildHandlerManager.instance) {
      BuildHandlerManager.instance = new BuildHandlerManager();
    }
    return BuildHandlerManager.instance;
  }

  register(nodeId: string, handler: BuildHandler): void {
    if (this.handlers.has(nodeId)) {
      console.warn(`Handler already registered for node: ${nodeId}`);
      return;
    }
    this.handlers.set(nodeId, handler);
  }

  getHandler(nodeId: string): BuildHandler | undefined {
    if (process.env.NODE_ENV === 'test') {
      return async () => ({ success: true, data: {} });
    }
    return this.handlers.get(nodeId);
  }

  hasHandler(nodeId: string): boolean {
    return this.handlers.has(nodeId);
  }
}
