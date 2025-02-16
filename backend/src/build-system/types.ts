import { BuilderContext } from './context';

/**
 * Base interface for build configuration
 */
export interface BuildBase {
  /**
   * Class reference that implements BuildHandler
   */
  handler: new () => BuildHandler;
  name?: string;
  description?: string;
  options?: BuildOpts;
}

/**
 * Build node configuration
 */
export interface BuildNode extends BuildBase {
  config?: Record<string, any>;
}

/**
 * Build sequence definition
 */
export interface BuildSequence {
  id: string;
  version: string;
  name: string;
  description?: string;
  databaseType?: string;
  nodes: BuildNode[];
}

/**
 * Build options
 */
export interface BuildOpts {
  projectPart?: 'frontend' | 'backend';
}

/**
 * Build result interface
 */
export interface BuildResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
}

/**
 * Build execution state
 */
export interface BuildExecutionState {
  completed: Set<string>;
  pending: Set<string>;
  failed: Set<string>;
  waiting: Set<string>;
}

/**
 * Build context
 */
export interface BuildContext {
  data: Record<string, any>;
  completedNodes: Set<string>;
  pendingNodes: Set<string>;
}

/**
 * Build handler interface
 */
export interface BuildHandler<T = any> {
  run(context: BuilderContext, opts?: BuildOpts): Promise<BuildResult<T>>;

  dependencies?: BuildHandlerConstructor[];
}

/**
 * Build handler constructor type
 */
export interface BuildHandlerConstructor<T = any> {
  new (): BuildHandler<T>;
}

/**
 * File structure output type
 */
export interface FileStructOutput {
  fileStructure: string;
  jsonFileStructure: string;
}

/**
 * Backend requirement output type
 */
export interface BackendRequirementOutput {
  overview: string;
  implementation: string;
  config: {
    language: string;
    framework: string;
    packages: Record<string, string>;
  };
}

/**
 * Extract handler type utility
 */
export type ExtractHandlerType<T> = T extends BuildHandler<infer U> ? U : never;

/**
 * Extract handler return type utility
 */
export type ExtractHandlerReturnType<T extends new () => BuildHandler<any>> =
  ExtractHandlerType<InstanceType<T>>;
