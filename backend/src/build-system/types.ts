import { ModelProvider } from 'src/common/model-provider';
import { BuilderContext } from './context';
import { BuildOptions } from 'typescript';

export type BuildNodeType =
  | 'PROJECT_SETUP'
  | 'ANALYSIS'
  | 'DATABASE'
  | 'BACKEND'
  | 'UX'
  | 'WEBAPP';

export type BuildSubType = {
  ANALYSIS: 'PRD' | 'FRD' | 'DRD' | 'BRD' | 'UXSD' | 'UXDD';
  DATABASE: 'SCHEMAS' | 'POSTGRES';
  BACKEND: 'OPENAPI' | 'ASYNCAPI' | 'SERVER';
  UX: 'SITEMAP' | 'DATAMAP' | 'VIEWS';
  WEBAPP: 'STORE' | 'ROOT' | 'VIEW';
  PROJECT_SETUP: never;
};

export interface BuildBase {
  id: string;
  name?: string;
  description?: string;
  requires?: string[];
  options?: BuildOpts;
}

export interface BuildNode extends BuildBase {
  type?: BuildNodeType;
  subType?: BuildSubType[BuildNodeType];
  config?: Record<string, any>;
}

export interface BuildStep {
  id: string;
  name: string;
  description?: string;
  parallel?: boolean;
  nodes: BuildNode[];
}

export interface BuildSequence {
  id: string;
  version: string;
  name: string;
  description?: string;
  //TODO: adding dependencies infos list here
  //TODO: adding type for database maybe
  databaseType?: string;
  steps: BuildStep[];
}

export interface BuildHandlerContext {
  data: Record<string, any>;
  run: (nodeId: string) => Promise<BuildResult>;
}

export interface BuildHandlerRegistry {
  [key: string]: BuildHandler;
}
export interface BuildContext {
  data: Record<string, any>;
  completedNodes: Set<string>;
  pendingNodes: Set<string>;
}

export interface BuildResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
}

export interface BuildExecutionState {
  completed: Set<string>;
  pending: Set<string>;
  failed: Set<string>;
  waiting: Set<string>;
}

export interface BuildOpts {
  projectPart?: 'frontend' | 'backend';
}
export interface BuildHandler<T = any> {
  // Unique identifier for the handler
  id: string;

  /**
   *
   * @param context the context object for the build
   * @param model model provider for the build
   * @param args the request arguments
   */
  run(context: BuilderContext, opts?: BuildOpts): Promise<BuildResult<T>>;
}

export interface NodeOutputMap {
  'op:DATABASE_REQ': string;
  'op:PRD': string;
  'op:UX:SMD': string;
  'op:UX:SMS': string;
  'op:UX:SMS:LEVEL2': string;
  'op:UX:DATAMAP:DOC': string;
  'op:FILE:STRUCT': string;
  'op:FILE:ARCH': string;
  'op:FILE:GENERATE': string;
  'op:BACKEND:CODE': string;
  'op:BACKEND:REQ': {
    overview: string;
    implementation: string;
    config: {
      language: string;
      framework: string;
      packages: Record<string, string>;
    };
  };
}
