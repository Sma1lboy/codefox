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

/**
 * Global data keys used throughout the build process
 * @type GlobalDataKeys
 */
export type GlobalDataKeys =
  | 'projectName'
  | 'description'
  | 'platform'
  | 'databaseType'
  | 'projectUUID';

/**
 * Generic context data type mapping keys to any value
 * @type ContextData
 */
type ContextData = Record<GlobalDataKeys | string, any>;

/**
 * Core build context class that manages the execution of build sequences
 * @class BuilderContext
 * @description Responsible for:
 * - Managing build execution state
 * - Handling node dependencies and execution order
 * - Managing global and node-specific context data
 * - Coordinating with build handlers and monitors
 * - Managing virtual directory operations
 */
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
      this.monitor.endSequenceExecution(
        this.sequence.id,
        this.globalContext.get('projectUUID'),
      );
    }
  }

  /**
   * Executes a build step, handling both parallel and sequential node execution
   * @param step The build step to execute
   * @private
   */
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

  /**
   * Executes nodes in parallel within a build step
   * @param step The build step containing nodes to execute in parallel
   * @private
   */
  private async executeParallelNodes(step: BuildStep): Promise<void> {
    let remainingNodes = [...step.nodes];
    const concurrencyLimit = 3; // TODO: current is manually set to 3 for testing purposes

    while (remainingNodes.length > 0) {
      const executableNodes = remainingNodes.filter((node) =>
        this.canExecute(node.id),
      );

      if (executableNodes.length > 0) {
        for (let i = 0; i < executableNodes.length; i += concurrencyLimit) {
          const batch = executableNodes.slice(i, i + concurrencyLimit);

          try {
            const nodeExecutionPromises = batch.map(async (node) => {
              if (this.executionState.completed.has(node.id)) {
                return;
              }

              const currentStep = this.monitor.getCurrentStep();
              this.monitor.startNodeExecution(
                node.id,
                this.sequence.id,
                currentStep.id,
              );

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

                this.logger.log(`Executing node ${node.id} in parallel batch`);
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
            });

            await Promise.all(nodeExecutionPromises);

            const activeModelPromises = this.model.getAllActivePromises();
            if (activeModelPromises.length > 0) {
              this.logger.debug(
                `Waiting for ${activeModelPromises.length} active LLM requests to complete`,
              );
              await Promise.all(activeModelPromises);
            }
          } catch (error) {
            this.logger.error(
              `Error executing parallel nodes batch: ${error}`,
              error instanceof Error ? error.stack : undefined,
            );
            throw error;
          }
        }

        remainingNodes = remainingNodes.filter(
          (node) => !this.executionState.completed.has(node.id),
        );
      } else {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const activeModelPromises = this.model.getAllActivePromises();
        if (activeModelPromises.length > 0) {
          this.logger.debug(
            `Waiting for ${activeModelPromises.length} active LLM requests during retry`,
          );
          await Promise.all(activeModelPromises);
        }
      }
    }

    const finalActivePromises = this.model.getAllActivePromises();
    if (finalActivePromises.length > 0) {
      this.logger.debug(
        `Final wait for ${finalActivePromises.length} remaining LLM requests`,
      );
      await Promise.all(finalActivePromises);
    }
  }

  /**
   * Executes nodes sequentially within a build step
   * @param step The build step containing nodes to execute sequentially
   * @private
   */
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

  /**
   * Checks if a node can be executed based on its dependencies
   * @param nodeId The ID of the node to check
   * @returns boolean indicating if the node can be executed
   */
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

  /**
   * Sets data in the global context
   * @param key The key to set
   * @param value The value to set
   */
  setGlobalContext<Key extends GlobalDataKeys | string>(
    key: Key,
    value: ContextData[Key],
  ): void {
    this.globalContext.set(key, value);
  }

  /**
   * Gets data from the global context
   * @param key The key to retrieve
   * @returns The value associated with the key, or undefined
   */
  getGlobalContext<Key extends GlobalDataKeys | string>(
    key: Key,
  ): ContextData[Key] | undefined {
    return this.globalContext.get(key);
  }

  /**
   * Retrieves node-specific data
   * @param nodeId The ID of the node
   * @returns The data associated with the node
   */
  getNodeData<NodeId extends keyof NodeOutputMap>(
    nodeId: NodeId,
  ): NodeOutputMap[NodeId];
  getNodeData(nodeId: string): any;
  getNodeData(nodeId: string) {
    return this.nodeData.get(nodeId);
  }

  /**
   * Sets node-specific data
   * @param nodeId The ID of the node
   * @param data The data to associate with the node
   */
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
    const handler = this.handlerManager.getHandler(node.id);
    if (!handler) {
      throw new Error(`No handler found for node: ${node.id}`);
    }

    return handler.run(this, node.options);
  }
}
