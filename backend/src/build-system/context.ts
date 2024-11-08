import { BuildNode, BuildSequence, BuildStep } from './types';

export interface BuildContext {
  data: Record<string, any>;
  completedNodes: Set<string>;
  pendingNodes: Set<string>;
}

export interface BuildResult {
  success: boolean;
  data?: any;
  error?: Error;
}

export interface BuildExecutionState {
  completed: Set<string>;
  pending: Set<string>;
  failed: Set<string>;
  waiting: Set<string>;
}

export class BuilderContext {
  private state: BuildExecutionState = {
    completed: new Set(),
    pending: new Set(),
    failed: new Set(),
    waiting: new Set(),
  };

  private data: Record<string, any> = {};

  constructor(private sequence: BuildSequence) {}

  canExecute(nodeId: string): boolean {
    const node = this.findNode(nodeId);
    if (!node) return false;

    if (this.state.completed.has(nodeId) || this.state.pending.has(nodeId)) {
      return false;
    }

    // 检查所有依赖是否已完成
    return !node.requires?.some((dep) => !this.state.completed.has(dep));
  }

  // 查找节点
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
    console.log(`Executing node: ${node.id}`);
    return { success: true, data: {} };
  }
}
