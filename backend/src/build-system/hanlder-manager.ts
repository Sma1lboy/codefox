import { BuildHandler, BuildHandlerConstructor } from './types';

/**
 * 构建处理器管理器
 */
export class BuildHandlerManager {
  private static instance: BuildHandlerManager;
  private handlers = new Map<BuildHandlerConstructor, BuildHandler>();
  private dependencies = new Map<
    BuildHandlerConstructor,
    BuildHandlerConstructor[]
  >();

  private constructor() {}

  static getInstance(): BuildHandlerManager {
    if (!BuildHandlerManager.instance) {
      BuildHandlerManager.instance = new BuildHandlerManager();
    }
    return BuildHandlerManager.instance;
  }

  /**
   * 注册处理器
   */
  registerHandler<T extends BuildHandler>(
    handlerClass: BuildHandlerConstructor<T>,
  ): void {
    if (!this.handlers.has(handlerClass)) {
      this.handlers.set(handlerClass, new handlerClass());
    }
  }

  /**
   * 获取处理器实例
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
   * 注册处理器依赖
   */
  registerDependencies(
    handlerClass: BuildHandlerConstructor,
    dependencies: BuildHandlerConstructor[],
  ): void {
    this.dependencies.set(handlerClass, dependencies);
  }

  /**
   * 获取处理器依赖
   */
  getDependencies(
    handlerClass: BuildHandlerConstructor,
  ): BuildHandlerConstructor[] {
    return this.dependencies.get(handlerClass) || [];
  }

  /**
   * 验证处理器依赖
   */
  validateDependencies(handlerClass: BuildHandlerConstructor): boolean {
    const dependencies = this.getDependencies(handlerClass);
    return dependencies.every((dep) => this.handlers.has(dep));
  }

  /**
   * 清除所有注册的处理器
   */
  clear(): void {
    this.handlers.clear();
    this.dependencies.clear();
  }
}

/**
 * 处理器装饰器
 */
export function BuildNode() {
  return function <T extends BuildHandlerConstructor>(target: T): T {
    const manager = BuildHandlerManager.getInstance();
    manager.registerHandler(target);
    return target;
  };
}

/**
 * 依赖装饰器
 */
export function BuildNodeRequire(dependencies: BuildHandlerConstructor[]) {
  return function <T extends BuildHandlerConstructor>(target: T): T {
    const manager = BuildHandlerManager.getInstance();
    manager.registerDependencies(target, dependencies);
    return target;
  };
}

// // 使用示例
// @BuildNode()
// @NodeRequire([/* 依赖处理器 */])
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

// // 类型提取示例
// type ExampleOutput = ExtractHandlerType<typeof ExampleHandler>; // string
