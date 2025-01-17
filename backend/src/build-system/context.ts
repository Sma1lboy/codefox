import {
  BuildExecutionState,
  BuildResult,
  BuildSequence,
  BuildHandlerConstructor,
  ExtractHandlerReturnType,
  BuildHandler,
  ExtractHandlerType,
  BuildNode,
} from './types';
import { Logger } from '@nestjs/common';
import { VirtualDirectory } from './virtual-dir';
import { v4 as uuidv4 } from 'uuid';
import { BuildMonitor } from './monitor';
import { OpenAIModelProvider } from 'src/common/model-provider/openai-model-provider';
import { RetryHandler } from './retry-handler';
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
  | 'projectUUID'
  | 'backendPath'
  | 'frontendPath';

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

  private globalPromises: Set<Promise<any>> = new Set();
  private logger: Logger;
  private globalContext: Map<GlobalDataKeys | string, any> = new Map();
  private nodeData: Map<BuildHandlerConstructor, any> = new Map();

  private handlerManager: BuildHandlerManager;
  private retryHandler: RetryHandler;
  private monitor: BuildMonitor;
  public model: OpenAIModelProvider;
  public virtualDirectory: VirtualDirectory;

  constructor(
    private sequence: BuildSequence,
    id: string,
  ) {
    this.retryHandler = RetryHandler.getInstance();
    this.handlerManager = BuildHandlerManager.getInstance();
    this.model = OpenAIModelProvider.getInstance();
    this.monitor = BuildMonitor.getInstance();
    this.logger = new Logger(`builder-context-${id}`);
    this.virtualDirectory = new VirtualDirectory();

    // Initialize global context with default values
    this.globalContext.set('projectName', sequence.name);
    this.globalContext.set('description', sequence.description || '');
    this.globalContext.set('platform', 'web');
    this.globalContext.set('databaseType', sequence.databaseType || 'SQLite');
    this.globalContext.set(
      'projectUUID',
      new Date().toISOString().slice(0, 10).replace(/:/g, '-') + '-' + uuidv4(),
    );
  }

  async execute(): Promise<void> {
    this.logger.log(`Starting build sequence: ${this.sequence.id}`);
    this.monitor.startSequenceExecution(this.sequence);

    try {
      const nodes = this.sequence.nodes;
      const windowSize = 20;
      let windowStart = 0;

      while (windowStart < nodes.length) {
        const windowEnd = Math.min(windowStart + windowSize, nodes.length);
        const windowNodes = nodes.slice(windowStart, windowEnd);

        const executableNodes = windowNodes.filter((node) =>
          this.canExecute(node),
        );

        if (executableNodes.length > 0) {
          await Promise.all(
            executableNodes.map(async (node) => {
              const handlerClass = node.handler
                .constructor as BuildHandlerConstructor;
              if (this.executionState.completed.has(handlerClass.name)) {
                return;
              }

              this.monitor.startNodeExecution(
                handlerClass.name,
                this.sequence.id,
              );

              try {
                this.logger.log(`Executing node ${handlerClass.name}`);
                await this.executeNode(node);

                this.monitor.endNodeExecution(
                  handlerClass.name,
                  this.sequence.id,
                  true,
                );
              } catch (error) {
                this.monitor.endNodeExecution(
                  handlerClass.name,
                  this.sequence.id,
                  false,
                  error instanceof Error ? error : new Error(String(error)),
                );
                throw error;
              }
            }),
          );
        }

        windowStart += windowSize;
      }

      const finalActivePromises = this.model.getAllActivePromises();
      if (finalActivePromises.length > 0) {
        this.logger.debug(
          `Final wait for ${finalActivePromises.length} remaining LLM requests`,
        );
        await Promise.all(finalActivePromises);
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
   * Checks if a node can be executed based on its dependencies
   * @param node The node to check
   * @returns boolean indicating if the node can be executed
   */
  private canExecute(node: BuildNode): boolean {
    const handlerClass = node.handler.constructor as BuildHandlerConstructor;
    const handlerName = handlerClass.name;

    if (
      this.executionState.completed.has(handlerName) ||
      this.executionState.pending.has(handlerName)
    ) {
      return false;
    }

    if (!node.requires) return true;

    return !node.requires.some(
      (reqName) => !this.executionState.completed.has(reqName),
    );
  }

  /**
   * Executes a specific node
   * @param node The node to execute
   * @returns Promise resolving to the build result
   */
  private async executeNode<T extends BuildHandler>(
    node: BuildNode,
  ): Promise<BuildResult<ExtractHandlerType<T>>> {
    const handlerClass = node.handler.constructor as BuildHandlerConstructor;
    const handlerName = handlerClass.name;

    try {
      this.executionState.pending.add(handlerName);
      const result = await this.invokeNodeHandler<ExtractHandlerType<T>>(node);
      this.executionState.completed.add(handlerName);
      this.logger.log(`${handlerName} is completed`);
      this.executionState.pending.delete(handlerName);

      this.setNodeData(handlerClass, result.data);
      return result;
    } catch (error) {
      this.executionState.failed.add(handlerName);
      this.executionState.pending.delete(handlerName);
      throw error;
    }
  }

  /**
   * Invokes a handler for a specific node
   * @param node The node to execute
   * @returns Promise resolving to the build result
   */
  private async invokeNodeHandler<T>(node: BuildNode): Promise<BuildResult<T>> {
    const handlerClass = node.handler.constructor as BuildHandlerConstructor;
    this.logger.log(`solving ${handlerClass.name}`);

    if (!this.handlerManager.validateDependencies(handlerClass)) {
      throw new Error(`Dependencies not met for handler: ${handlerClass.name}`);
    }

    try {
      return await node.handler.run(this, node.options);
    } catch (e) {
      this.logger.error(`retrying ${handlerClass.name}`);
      const result = await this.retryHandler.retryMethod(
        e,
        (node) => this.invokeNodeHandler(node),
        [node],
      );
      if (result === undefined) {
        throw e;
      }
      return result as BuildResult<T>;
    }
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
   * Retrieves node-specific data with type inference
   * @param handlerClass The handler class to get data for
   * @returns The strongly typed data associated with the handler
   */
  getNodeData<T extends BuildHandlerConstructor>(
    handlerClass: T,
  ): ExtractHandlerReturnType<T> | undefined {
    return this.nodeData.get(handlerClass);
  }

  /**
   * Sets node-specific data with type checking
   * @param handlerClass The handler class to set data for
   * @param data The strongly typed data to associate with the handler
   */
  setNodeData<T extends BuildHandlerConstructor>(
    handlerClass: T,
    data: ExtractHandlerReturnType<T>,
  ): void {
    this.nodeData.set(handlerClass, data);
  }

  getExecutionState(): BuildExecutionState {
    return { ...this.executionState };
  }

  buildVirtualDirectory(jsonContent: string): boolean {
    return this.virtualDirectory.parseJsonStructure(jsonContent);
  }
}
