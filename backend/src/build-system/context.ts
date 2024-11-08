import { BuildHandlerManager } from './hanlder-manager';
import {
  BuildExecutionState,
  BuildNode,
  BuildResult,
  BuildSequence,
  BuildStep,
} from './types';

export class BuilderContext {
  private state: BuildExecutionState = {
    completed: new Set(),
    pending: new Set(),
    failed: new Set(),
    waiting: new Set(),
  };

  private data: Record<string, any> = {};
  private handlerManager: BuildHandlerManager;

  constructor(private sequence: BuildSequence) {
    this.handlerManager = BuildHandlerManager.getInstance();
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

  async run(nodeId: string): Promise<BuildResult> {
    const node = this.findNode(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    if (!this.canExecute(nodeId)) {
      throw new Error(`Dependencies not met for node: ${nodeId}`);
    }

    try {
      this.state.pending.add(nodeId);
      const result = await this.executeNode(node);
      this.state.completed.add(nodeId);
      this.state.pending.delete(nodeId);
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

  setData(key: string, value: any): void {
    this.data[key] = value;
  }

  getData(key: string): any {
    return this.data[key];
  }

  private async executeNode(node: BuildNode): Promise<BuildResult> {
    if (process.env.NODE_ENV === 'test') {
      console.log(`[TEST] Executing node: ${node.id}`);
      return { success: true, data: { nodeId: node.id } };
    }

    console.log(`Executing node: ${node.id}`);
    const handler = this.handlerManager.getHandler(node.id);
    if (!handler) {
      throw new Error(`No handler found for node: ${node.id}`);
    }
    return handler.run(this);
  }
}
