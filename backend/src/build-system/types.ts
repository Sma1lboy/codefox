import { BuilderContext } from './context';

// 基础构建接口
export interface BuildBase {
  handler: BuildHandler;
  name?: string;
  description?: string;
  requires?: string[];
  options?: BuildOpts;
}

// 构建节点配置
export interface BuildNode extends BuildBase {
  config?: Record<string, any>;
}

// 构建序列定义
export interface BuildSequence {
  id: string;
  version: string;
  name: string;
  description?: string;
  databaseType?: string;
  nodes: BuildNode[];
}

// 构建选项
export interface BuildOpts {
  projectPart?: 'frontend' | 'backend';
}

// 构建结果接口
export interface BuildResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
}

// 构建执行状态
export interface BuildExecutionState {
  completed: Set<string>;
  pending: Set<string>;
  failed: Set<string>;
  waiting: Set<string>;
}

// 构建上下文
export interface BuildContext {
  data: Record<string, any>;
  completedNodes: Set<string>;
  pendingNodes: Set<string>;
}

// 构建处理器接口
export interface BuildHandler<T = any> {
  run(context: BuilderContext, opts?: BuildOpts): Promise<BuildResult<T>>;
}

// 处理器构造函数类型
export interface BuildHandlerConstructor<T = any> {
  new (): BuildHandler<T>;
}

// 特定输出类型（仅保留实际需要的具体类型定义）
export interface FileStructOutput {
  fileStructure: string;
  jsonFileStructure: string;
}

export interface BackendRequirementOutput {
  overview: string;
  implementation: string;
  config: {
    language: string;
    framework: string;
    packages: Record<string, string>;
  };
}

// 工具类型：从处理器中提取输出类型
export type ExtractHandlerType<T> = T extends BuildHandler<infer U> ? U : never;

// 工具类型：从处理器构造函数中提取输出类型
export type ExtractHandlerReturnType<T extends new () => BuildHandler<any>> =
  ExtractHandlerType<InstanceType<T>>;
