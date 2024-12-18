import {
  BuildExecutionState,
  BuildNode,
  BuildResult,
  BuildSequence,
  BuildStep,
  NodeOutputMap,
} from './types';
import { Logger } from '@nestjs/common';
import { VirtualDirectory } from './virtual-dir';
import { ModelProvider } from 'src/common/model-provider';
import { v4 as uuidv4 } from 'uuid';
import { BuildMonitor } from './monitor';
import { BuildHandlerManager } from './hanlder-manager';

export type GlobalDataKeys =
  | 'projectName'
  | 'description'
  | 'platform'
  | 'databaseType'
  | 'projectUUID';

type ContextData = Record<GlobalDataKeys | string, any>;

export class BuilderContext {
  private executionState: BuildExecutionState = {
    completed: new Set(),
    pending: new Set(),
    failed: new Set(),
    waiting: new Set(),
  };

  private logger: Logger;
  private globalContext: Map<GlobalDataKeys | string, any> = new Map();
  private nodeData: Map<string, any> = new Map();

  private handlerManager: BuildHandlerManager;
  private monitor: BuildMonitor;
  public model: ModelProvider;
  public virtualDirectory: VirtualDirectory;

  constructor(
    private sequence: BuildSequence,
    id: string,
  ) {
    this.handlerManager = BuildHandlerManager.getInstance();
    this.model = ModelProvider.getInstance();
    this.monitor = BuildMonitor.getInstance();
    this.logger = new Logger(`builder-context-${id}`);
    this.virtualDirectory = new VirtualDirectory();

    // Initialize global context with default values
    this.globalContext.set('projectName', sequence.name);
    this.globalContext.set('description', sequence.description || '');
    this.globalContext.set('platform', 'web');
    this.globalContext.set('databaseType', sequence.databaseType || 'SQLite');
    this.globalContext.set('projectUUID', uuidv4());
  }

  async execute(): Promise<void> {
    this.logger.log(`Starting build sequence: ${this.sequence.id}`);
    this.monitor.startSequenceExecution(this.sequence);

    try {
      for (const step of this.sequence.steps) {
        await this.executeStep(step);

        const incompletedNodes = step.nodes.filter(
          (node) => !this.executionState.completed.has(node.id),
        );

        if (incompletedNodes.length > 0) {
          this.logger.warn(
            `Step ${step.id} failed to complete nodes: ${incompletedNodes
              .map((n) => n.id)
              .join(', ')}`,
          );
          return;
        }
      }

      this.logger.log(`Build sequence completed: ${this.sequence.id}`);
      this.logger.log('Final execution state:', this.executionState);
    } finally {
      this.monitor.endSequenceExecution(this.sequence.id);
    }
  }

  private async executeStep(step: BuildStep): Promise<void> {
    this.logger.log(`Executing build step: ${step.id}`);
    this.monitor.setCurrentStep(step);
    this.monitor.startStepExecution(
      step.id,
      this.sequence.id,
      step.parallel,
      step.nodes.length,
    );

    try {
      if (step.parallel) {
        await this.executeParallelNodes(step);
      } else {
        await this.executeSequentialNodes(step);
      }
    } finally {
      this.monitor.endStepExecution(step.id, this.sequence.id);
    }
  }

  private async executeParallelNodes(step: BuildStep): Promise<void> {
    let remainingNodes = [...step.nodes];
    let lastLength = remainingNodes.length;
    let retryCount = 0;
    const maxRetries = 10;

    while (remainingNodes.length > 0 && retryCount < maxRetries) {
      const executableNodes = remainingNodes.filter((node) =>
        this.canExecute(node.id),
      );

      if (executableNodes.length > 0) {
        await Promise.all(
          executableNodes.map((node) => this.executeNode(node)),
        );

        remainingNodes = remainingNodes.filter(
          (node) => !this.executionState.completed.has(node.id),
        );

        if (remainingNodes.length < lastLength) {
          retryCount = 0;
          lastLength = remainingNodes.length;
        } else {
          retryCount++;
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 100));
        retryCount++;
      }
    }

    if (remainingNodes.length > 0) {
      throw new Error(
        `Unable to complete all nodes in step ${step.id}. Remaining: ${remainingNodes
          .map((n) => n.id)
          .join(', ')}`,
      );
    }
  }

  private async executeSequentialNodes(step: BuildStep): Promise<void> {
    for (const node of step.nodes) {
      let retryCount = 0;
      const maxRetries = 10;

      while (
        !this.executionState.completed.has(node.id) &&
        retryCount < maxRetries
      ) {
        await this.executeNode(node);

        if (!this.executionState.completed.has(node.id)) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          retryCount++;
        }
      }

      if (!this.executionState.completed.has(node.id)) {
        this.logger.warn(
          `Failed to execute node ${node.id} after ${maxRetries} attempts`,
        );
      }
    }
  }

  private async executeNode(node: BuildNode): Promise<void> {
    if (this.executionState.completed.has(node.id)) {
      return;
    }

    const currentStep = this.monitor.getCurrentStep();
    this.monitor.startNodeExecution(node.id, this.sequence.id, currentStep.id);

    try {
      if (!this.canExecute(node.id)) {
        this.logger.log(
          `Waiting for dependencies of node ${node.id}: ${node.requires?.join(
            ', ',
          )}`,
        );
        this.monitor.incrementNodeRetry(
          node.id,
          this.sequence.id,
          currentStep.id,
        );
        return;
      }

      this.logger.log(`Executing node ${node.id}`);
      await this.executeNodeById(node.id);

      this.monitor.endNodeExecution(
        node.id,
        this.sequence.id,
        currentStep.id,
        true,
      );
    } catch (error) {
      this.monitor.endNodeExecution(
        node.id,
        this.sequence.id,
        currentStep.id,
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  canExecute(nodeId: string): boolean {
    const node = this.findNode(nodeId);

    if (!node) return false;

    if (
      this.executionState.completed.has(nodeId) ||
      this.executionState.pending.has(nodeId)
    ) {
      this.logger.debug(`Node ${nodeId} is already completed or pending.`);
      return false;
    }

    return !node.requires?.some(
      (dep) => !this.executionState.completed.has(dep),
    );
  }

  private async executeNodeById<T = any>(
    nodeId: string,
  ): Promise<BuildResult<T>> {
    const node = this.findNode(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    if (!this.canExecute(nodeId)) {
      throw new Error(`Dependencies not met for node: ${nodeId}`);
    }

    try {
      this.executionState.pending.add(nodeId);
      const result = await this.invokeNodeHandler<T>(node);
      this.executionState.completed.add(nodeId);
      this.executionState.pending.delete(nodeId);

      this.nodeData.set(node.id, result.data);
      return result;
    } catch (error) {
      this.executionState.failed.add(nodeId);
      this.executionState.pending.delete(nodeId);
      throw error;
    }
  }

  getExecutionState(): BuildExecutionState {
    return { ...this.executionState };
  }

  setGlobalContext<Key extends GlobalDataKeys | string>(
    key: Key,
    value: ContextData[Key],
  ): void {
    this.globalContext.set(key, value);
  }

  getGlobalContext<Key extends GlobalDataKeys | string>(
    key: Key,
  ): ContextData[Key] | undefined {
    return this.globalContext.get(key);
  }

  getNodeData<NodeId extends keyof NodeOutputMap>(
    nodeId: NodeId,
  ): NodeOutputMap[NodeId];
  getNodeData(nodeId: string): any;
  getNodeData(nodeId: string) {
    return this.nodeData.get(nodeId);
  }

  setNodeData<NodeId extends keyof NodeOutputMap>(
    nodeId: NodeId,
    data: any,
  ): void {
    this.nodeData.set(nodeId, data);
  }

  buildVirtualDirectory(jsonContent: string): boolean {
    return this.virtualDirectory.parseJsonStructure(jsonContent);
  }

  private findNode(nodeId: string): BuildNode | null {
    for (const step of this.sequence.steps) {
      const node = step.nodes.find((n) => n.id === nodeId);
      if (node) return node;
    }
    return null;
  }

  private async invokeNodeHandler<T>(node: BuildNode): Promise<BuildResult<T>> {
    this.logger.log(`Executing node handler: ${node.id}`);
    const handler = this.handlerManager.getHandler(node.id);
    if (!handler) {
      throw new Error(`No handler found for node: ${node.id}`);
    }

    return handler.run(this, node.options);
  }
}
