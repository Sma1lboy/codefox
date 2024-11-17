import { ModelProvider } from 'src/common/model-provider';
import { BuildHandlerManager } from './hanlder-manager';
import {
  BuildExecutionState,
  BuildNode,
  BuildResult,
  BuildSequence,
} from './types';
import { Logger } from '@nestjs/common';

export type GlobalDataKeys = 'projectName' | 'description' | 'platform';
type ContextData = {
  [key in GlobalDataKeys]: string;
} & Record<string, any>;

export class BuilderContext {
  private state: BuildExecutionState = {
    completed: new Set(),
    pending: new Set(),
    failed: new Set(),
    waiting: new Set(),
  };
  private logger;
  private data: Record<string, any> = {};
  // Store the results of the nodes
  private results: Map<string, BuildResult> = new Map();
  private handlerManager: BuildHandlerManager;
  public model: ModelProvider;

  constructor(
    private sequence: BuildSequence,
    id: string,
  ) {
    this.handlerManager = BuildHandlerManager.getInstance();
    new Logger(`builder-context-${id}`);
  }

  canExecute(nodeId: string): boolean {
    const node = this.findNode(nodeId);
    if (!node) return false;

    if (this.state.completed.has(nodeId) || this.state.pending.has(nodeId)) {
      return false;
    }

    return !node.requires?.some((dep) => !this.state.completed.has(dep));
  }

  private findNode(nodeId: string): BuildNode | null {
    for (const step of this.sequence.steps) {
      const node = step.nodes.find((n) => n.id === nodeId);
      if (node) return node;
    }
    return null;
  }

  async run(nodeId: string, args: unknown | undefined): Promise<BuildResult> {
    const node = this.findNode(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    if (!this.canExecute(nodeId)) {
      throw new Error(`Dependencies not met for node: ${nodeId}`);
    }

    try {
      this.state.pending.add(nodeId);
      const result = await this.executeNode(node, args);
      this.state.completed.add(nodeId);
      this.state.pending.delete(nodeId);

      // Store the result for future use
      this.results.set(nodeId, result);

      return result;
    } catch (error) {
      this.state.failed.add(nodeId);
      this.state.pending.delete(nodeId);
      throw error;
    }
  }

  getState(): BuildExecutionState {
    return { ...this.state };
  }

  setData<Key extends keyof ContextData>(
    key: Key,
    value: ContextData[Key],
  ): void {
    this.data[key] = value;
  }

  getData<Key extends keyof ContextData>(key: Key): ContextData[Key] {
    if (!(key in this.data)) {
      throw new Error(`Data key "${key}" is not set or does not exist.`);
    }
    return this.data[key];
  }

  getResult(nodeId: string): BuildResult | undefined {
    return this.results.get(nodeId);
  }

  private async executeNode(
    node: BuildNode,
    args: unknown,
  ): Promise<BuildResult> {
    if (process.env.NODE_ENV === 'test') {
      this.logger.log(`[TEST] Executing node: ${node.id}`);
      return { success: true, data: { nodeId: node.id } };
    }

    this.logger.log(`Executing node: ${node.id}`);
    const handler = this.handlerManager.getHandler(node.id);
    if (!handler) {
      throw new Error(`No handler found for node: ${node.id}`);
    }
    return handler.run(this, args);
  }
}
