import { ModelProvider } from 'src/common/model-provider';
import { BuildHandlerManager } from './hanlder-manager';
import {
  BuildExecutionState,
  BuildNode,
  BuildResult,
  BuildSequence,
  NodeOutputMap,
} from './types';
import { Logger } from '@nestjs/common';
import { VirtualDirectory } from './virtual-dir';

/**
 * Predefined global keys for context.
 */
export type GlobalDataKeys =
  | 'projectName'
  | 'description'
  | 'platform'
  | 'databaseType';

/**
 * ContextData type, allowing dynamic keys and predefined keys.
 */
type ContextData = Record<GlobalDataKeys | string, any>;

/**
 * BuilderContext manages:
 * - Execution state of nodes (completed, pending, failed, waiting)
 * - Global and arbitrary data (projectName, description, etc.)
 * - Node output data, stored after successful execution
 * - References to model provider, handler manager, virtual directory
 */
export class BuilderContext {
  private executionState: BuildExecutionState = {
    completed: new Set(),
    pending: new Set(),
    failed: new Set(),
    waiting: new Set(),
  };

  private logger: Logger;
  private globalContext: Map<GlobalDataKeys | string, any> = new Map(); // Stores global context data
  private nodeData: Map<string, any> = new Map(); // Stores node outputs

  private handlerManager: BuildHandlerManager;
  public model: ModelProvider;
  public virtualDirectory: VirtualDirectory;

  constructor(
    private sequence: BuildSequence,
    id: string,
  ) {
    this.handlerManager = BuildHandlerManager.getInstance();
    this.model = ModelProvider.getInstance();
    this.logger = new Logger(`builder-context-${id}`);
    this.virtualDirectory = new VirtualDirectory();

    // Initialize global context with default values
    this.globalContext.set('projectName', sequence.name);
    this.globalContext.set('description', sequence.description || '');
    this.globalContext.set('platform', 'web');
    this.globalContext.set('databaseType', sequence.databaseType || 'SQLite');
  }

  /**
   * Checks if a node can be executed.
   * @param nodeId The ID of the node.
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

  /**
   * Executes a node by its ID. Upon success, stores node output data.
   * @param nodeId The ID of the node to execute.
   */
  async executeNodeById<T = any>(nodeId: string): Promise<BuildResult<T>> {
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

      // Store the typed data from the node's result
      this.nodeData.set(node.id, result.data);
      return result;
    } catch (error) {
      this.executionState.failed.add(nodeId);
      this.executionState.pending.delete(nodeId);
      throw error;
    }
  }

  /**
   * Returns the current execution state of the build sequence.
   */
  getExecutionState(): BuildExecutionState {
    return { ...this.executionState };
  }

  /**
   * Store global context data.
   * @param key The key to store.
   * @param value The value to store.
   */
  setGlobalContext<Key extends GlobalDataKeys | string>(
    key: Key,
    value: ContextData[Key],
  ): void {
    this.globalContext.set(key, value);
  }

  /**
   * Retrieve global context data.
   * @param key The key to retrieve.
   */
  getGlobalContext<Key extends GlobalDataKeys | string>(
    key: Key,
  ): ContextData[Key] | undefined {
    return this.globalContext.get(key);
  }

  /**
   * Retrieve the stored output data for a given node (typed if defined in NodeOutputMap).
   * Overload 1: If nodeId is a key of NodeOutputMap, return strong-typed data.
   */
  getNodeData<NodeId extends keyof NodeOutputMap>(
    nodeId: NodeId,
  ): NodeOutputMap[NodeId];

  /**
   * Overload 2: If nodeId is not in NodeOutputMap, return any.
   */
  getNodeData(nodeId: string): any;

  getNodeData(nodeId: string) {
    return this.nodeData.get(nodeId);
  }

  /**
   * Builds the virtual directory from a given JSON content.
   */
  buildVirtualDirectory(jsonContent: string): boolean {
    return this.virtualDirectory.parseJsonStructure(jsonContent);
  }

  /**
   * Finds a node in the sequence by its ID.
   * @param nodeId Node ID to find
   */
  private findNode(nodeId: string): BuildNode | null {
    for (const step of this.sequence.steps) {
      const node = step.nodes.find((n) => n.id === nodeId);
      if (node) return node;
    }
    return null;
  }

  /**
   * Invokes the node's handler and returns its BuildResult.
   * @param node The node to execute.
   */
  private async invokeNodeHandler<T>(node: BuildNode): Promise<BuildResult<T>> {
    this.logger.log(`Executing node handler: ${node.id}`);
    const handler = this.handlerManager.getHandler(node.id);
    if (!handler) {
      throw new Error(`No handler found for node: ${node.id}`);
    }
    return handler.run(this);
  }
}
