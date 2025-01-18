import { BuildHandler, BuildHandlerConstructor } from './types';

/**
 * Build Handler Manager
 * This class is a singleton responsible for managing instances of BuildHandlers.
 */
export class BuildHandlerManager {
  private static instance: BuildHandlerManager;
  private handlers = new Map<BuildHandlerConstructor, BuildHandler>();

  private constructor() {}

  /**
   * Get the singleton instance of BuildHandlerManager
   * @returns The instance of BuildHandlerManager
   */
  static getInstance(): BuildHandlerManager {
    if (!BuildHandlerManager.instance) {
      BuildHandlerManager.instance = new BuildHandlerManager();
    }
    return BuildHandlerManager.instance;
  }

  /**
   * Register a build handler
   * @param handlerClass The constructor of the handler to register
   */
  registerHandler<T extends BuildHandler>(
    handlerClass: BuildHandlerConstructor<T>,
  ): void {
    if (!this.handlers.has(handlerClass)) {
      // Create an instance of the handler if not already registered
      this.handlers.set(handlerClass, new handlerClass());
    }
  }

  /**
   * Get an instance of a registered build handler
   * If the handler is not yet registered, it will be instantiated and registered.
   * @param handlerClass The constructor of the handler to retrieve
   * @returns An instance of the specified build handler
   */
  getHandler<T extends BuildHandler>(
    handlerClass: BuildHandlerConstructor<T>,
  ): T {
    let handler = this.handlers.get(handlerClass);
    if (!handler) {
      handler = new handlerClass();
      this.handlers.set(handlerClass, handler);
    }
    return handler as T;
  }

  /**
   * Clear all registered build handlers
   * This will remove all handler instances from the manager.
   */
  clear(): void {
    this.handlers.clear();
  }
}

/**
 * BuildNode Decorator
 * A decorator to register a handler class as a build handler.
 * This makes the handler class managed by the BuildHandlerManager.
 */
export function BuildNode() {
  return function <T extends BuildHandlerConstructor>(target: T): T {
    const manager = BuildHandlerManager.getInstance();
    manager.registerHandler(target); // Register the handler class
    return target;
  };
}

/**
 * BuildNodeRequire Decorator
 * A decorator to define dependencies for the handler class.
 * This specifies other handler classes that the current handler depends on.
 * @param dependencies A list of build handler constructors that this handler depends on.
 */
export function BuildNodeRequire(dependencies: BuildHandlerConstructor[]) {
  return function <T extends BuildHandlerConstructor>(target: T): T {
    target.prototype.dependencies = dependencies || []; // Store the dependencies in the class prototype
    return target;
  };
}

// Example usage:

// @BuildNode()
// @BuildNodeRequire([/* Dependencies */])
// class ExampleHandler implements BuildHandler<string> {
//   async run(
//     context: BuilderContext,
//     opts?: BuildOpts
//   ): Promise<BuildResult<string>> {
//     return {
//       success: true,
//       data: "Example result"
//     };
//   }
// }

// Type extraction example:
// type ExampleOutput = ExtractHandlerType<typeof ExampleHandler>;
// This type will be 'string' in this case, as the handler returns a string.
