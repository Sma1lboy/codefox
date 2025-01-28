import {
  BuildExecutionState,
  BuildResult,
  BuildSequence,
  BuildHandlerConstructor,
  ExtractHandlerReturnType,
  BuildHandler,
  ExtractHandlerType,
  BuildNode,
} from './types'; // Importing type definitions related to the build process
import { Logger } from '@nestjs/common'; // Logger class from NestJS for logging
import { VirtualDirectory } from './virtual-dir'; // Virtual directory utility for managing virtual file structures
import { v4 as uuidv4 } from 'uuid'; // UUID generator for unique identifiers
import { BuildMonitor } from './monitor'; // Monitor to track the build process
import { OpenAIModelProvider } from 'src/common/model-provider/openai-model-provider'; // OpenAI model provider for LLM operations
import { RetryHandler } from './retry-handler'; // Retry handler for retrying failed operations
import { BuildHandlerManager } from './hanlder-manager'; // Manager for building handler classes
import { sortBuildSequence } from './utils/build-utils';

/**
 * Global data keys used throughout the build process.
 * These keys represent different project-related data that can be accessed globally within the build context.
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
 * A generic context data type that maps keys to any value.
 * It allows storing and retrieving project-specific information in a flexible way.
 * @type ContextData
 */
type ContextData = Record<GlobalDataKeys | string, any>;

/**
 * Core build context class responsible for managing the execution of build sequences.
 * @class BuilderContext
 * @description This class handles:
 * - Managing the execution state of the build (completed, pending, failed, waiting).
 * - Handling the dependencies and execution order of nodes (steps in the build process).
 * - Managing global and node-specific context data.
 * - Coordinating with build handlers, monitors, and virtual directory operations.
 */
export class BuilderContext {
  // Keeps track of the execution state of nodes (completed, pending, failed, waiting)
  private executionState: BuildExecutionState = {
    completed: new Set(),
    pending: new Set(),
    failed: new Set(),
    waiting: new Set(),
  };

  // Logger instance for logging messages during the build process
  private logger: Logger;

  // Global context for storing project-related data
  private globalContext: Map<GlobalDataKeys | string, any> = new Map();

  // Node-specific data storage, keyed by handler constructors
  private nodeData: Map<BuildHandlerConstructor, any> = new Map();

  // Various services and utilities for managing the build process
  private handlerManager: BuildHandlerManager;
  private retryHandler: RetryHandler;
  private monitor: BuildMonitor;
  public model: OpenAIModelProvider;
  public virtualDirectory: VirtualDirectory;

  // Tracks running node executions, keyed by handler name
  private runningNodes: Map<string, Promise<BuildResult<any>>> = new Map();

  // Polling interval for checking dependencies or waiting for node execution
  private readonly POLL_INTERVAL = 500;

  /**
   * Constructor to initialize the BuilderContext.
   * Sets up the handler manager, retry handler, model provider, logger, and virtual directory.
   * Initializes the global context with default values.
   * @param sequence The build sequence containing nodes to be executed.
   * @param id Unique identifier for the builder context.
   */
  constructor(
    private sequence: BuildSequence,
    id: string,
  ) {
    // Initialize service instances
    this.retryHandler = RetryHandler.getInstance();
    this.handlerManager = BuildHandlerManager.getInstance();
    this.model = OpenAIModelProvider.getInstance();
    this.monitor = BuildMonitor.getInstance();
    this.logger = new Logger(`builder-context-${id}`);
    this.virtualDirectory = new VirtualDirectory();

    // Initialize global context with default project values
    this.globalContext.set('projectName', sequence.name);
    this.globalContext.set('description', sequence.description || '');
    this.globalContext.set('platform', 'web'); // Default platform is 'web'
    this.globalContext.set('databaseType', sequence.databaseType || 'SQLite');
    this.globalContext.set(
      'projectUUID',
      new Date().toISOString().slice(0, 10).replace(/:/g, '-') + '-' + uuidv4(),
    );
  }

  /**
   * Checks if a node can be executed based on its handler's execution state and dependencies.
   * @param node The node whose execution eligibility needs to be checked.
   * @returns True if the node can be executed, otherwise false.
   */
  private canExecute(node: BuildNode): boolean {
    const handlerName = node.handler.name;

    // Node cannot execute if it's already completed or pending execution
    if (
      this.executionState.completed.has(handlerName) ||
      this.executionState.pending.has(handlerName)
    ) {
      return false;
    }

    // Check if the node's dependencies are satisfied
    return this.checkNodeDependencies(node);
  }

  /**
   * Invokes a handler for a specific node and returns the result.
   * Handles retries in case of failure.
   * @param node The node whose handler should be invoked.
   * @returns The result of the handler's execution.
   */
  private async invokeNodeHandler<T>(node: BuildNode): Promise<BuildResult<T>> {
    const handlerClass = node.handler;
    this.logger.log(`[Handler Start] ${handlerClass.name}`);
    try {
      // Get the handler instance and execute it
      const handler = this.handlerManager.getHandler(handlerClass);
      const result = await handler.run(this); // Invoke handler's run method
      this.logger.log(`[Handler Success] ${handlerClass.name}`);
      return result;
    } catch (e) {
      // If handler fails, retry the operation
      this.logger.error(`[Handler Retry] ${handlerClass.name}`);
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

  // Context management methods for global and node-specific data

  /**
   * Sets a value in the global context for a specific key.
   * @param key The key to identify the context data.
   * @param value The value to store in the context.
   */
  setGlobalContext<Key extends GlobalDataKeys | string>(
    key: Key,
    value: ContextData[Key],
  ): void {
    this.globalContext.set(key, value);
  }

  /**
   * Gets a value from the global context for a specific key.
   * @param key The key of the context data.
   * @returns The value stored in the context, or undefined if not found.
   */
  getGlobalContext<Key extends GlobalDataKeys | string>(
    key: Key,
  ): ContextData[Key] | undefined {
    return this.globalContext.get(key);
  }

  /**
   * Retrieves node-specific data for a given handler class.
   * @param handlerClass The handler constructor whose node data should be retrieved.
   * @returns The node-specific data or undefined if not found.
   */
  getNodeData<T extends BuildHandlerConstructor>(
    handlerClass: T,
  ): ExtractHandlerReturnType<T> | undefined {
    return this.nodeData.get(handlerClass);
  }

  /**
   * Sets node-specific data for a given handler class.
   * @param handlerClass The handler constructor whose node data should be set.
   * @param data The data to store for the node.
   */
  setNodeData<T extends BuildHandlerConstructor>(
    handlerClass: T,
    data: ExtractHandlerReturnType<T>,
  ): void {
    this.nodeData.set(handlerClass, data);
  }

  /**
   * Gets the current execution state of the build process.
   * @returns The current execution state, including completed, pending, failed, and waiting nodes.
   */
  getExecutionState(): BuildExecutionState {
    return { ...this.executionState };
  }

  /**
   * Builds a virtual directory structure from the given JSON content.
   * @param jsonContent The JSON string representing the virtual directory structure.
   * @returns True if the structure was successfully parsed, false otherwise.
   */
  buildVirtualDirectory(jsonContent: string): boolean {
    return this.virtualDirectory.parseJsonStructure(jsonContent);
  }

  /**
   * Starts the execution of a specific node in the build sequence.
   * The node will be executed if it's eligible (i.e., not completed or pending).
   * @param node The node to execute.
   * @returns A promise resolving to the result of the node execution.
   */
  private startNodeExecution<T extends BuildHandler>(
    node: BuildNode,
  ): Promise<BuildResult<ExtractHandlerType<T>>> {
    const handlerName = node.handler.name;

    // If the node is already completed, pending, or failed, skip execution
    if (
      this.executionState.completed.has(handlerName) ||
      this.executionState.pending.has(handlerName) ||
      this.executionState.failed.has(handlerName)
    ) {
      this.logger.debug(`Node ${handlerName} already executed or in progress`);
      return;
    }

    // Mark the node as pending execution
    this.executionState.pending.add(handlerName);

    // Execute the node handler and update the execution state accordingly
    const executionPromise = this.invokeNodeHandler<ExtractHandlerType<T>>(node)
      .then((result) => {
        // Mark the node as completed and update the state
        this.executionState.completed.add(handlerName);
        this.executionState.pending.delete(handlerName);
        // Store the result of the node execution
        this.setNodeData(node.handler, result.data);
        return result;
      })
      .catch((error) => {
        // Mark the node as failed in case of an error
        this.executionState.failed.add(handlerName);
        this.executionState.pending.delete(handlerName);
        this.logger.error(`[Node Failed] ${handlerName}:`, error);
        throw error;
      });

    // Track the running node execution promise
    this.runningNodes.set(handlerName, executionPromise);
    return executionPromise;
  }

  /**
   * Executes the entire build sequence by iterating over all nodes in the sequence.
   * - The nodes are executed in the given order, respecting dependencies.
   * - Each node will only start execution once its dependencies are met.
   * - The method waits for all nodes to finish before completing.
   * @returns A promise that resolves when the entire build sequence is complete.
   */
  async execute(): Promise<void> {
    this.logger.log(`[Sequence Start] ${this.sequence.id}`);
    this.logger.debug(`Total nodes to execute: ${this.sequence.nodes.length}`);
    this.monitor.startSequenceExecution(this.sequence);

    try {
      const nodes = sortBuildSequence(this.sequence);
      let currentIndex = 0;
      const runningPromises = new Set<Promise<any>>();

      // Loop over all nodes and execute them one by one
      while (currentIndex < nodes.length) {
        const currentNode = nodes[currentIndex];
        if (!currentNode?.handler) {
          this.logger.error(
            `Invalid node at index ${currentIndex}, all node length: ${nodes.length}`,
          );
          throw new Error(`Invalid node at index ${currentIndex}`);
        }

        const handlerName = currentNode.handler.name;
        // If the node cannot be executed yet, wait for dependencies to resolve
        if (!this.canExecute(currentNode)) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.POLL_INTERVAL),
          );
          continue;
        }

        try {
          // Start the execution of the node and track its progress
          this.monitor.startNodeExecution(handlerName, this.sequence.id);
          const nodePromise = this.startNodeExecution(currentNode)
            .then((result) => {
              this.monitor.endNodeExecution(
                handlerName,
                this.sequence.id,
                true, // Mark the node execution as successful
              );
              runningPromises.delete(nodePromise);
              return result;
            })
            .catch((error) => {
              this.monitor.endNodeExecution(
                handlerName,
                this.sequence.id,
                false, // Mark the node execution as failed
                error instanceof Error ? error : new Error(String(error)),
              );
              runningPromises.delete(nodePromise); // Remove the node from the running list
              throw error;
            });

          // Add the node promise to the running promises set
          runningPromises.add(nodePromise);
          // Only increase the index if the node has been successfully started
          currentIndex++;
        } catch (error) {
          this.logger.error(`Failed to start node ${handlerName}:`, error);
          throw error;
        }
      }

      // Wait for all running nodes to finish
      while (runningPromises.size > 0) {
        this.logger.debug(
          `[Waiting] Remaining running nodes: ${runningPromises.size}`,
        );
        await Promise.all(Array.from(runningPromises));
        // Give other promises a chance to resolve
        await new Promise((resolve) => setTimeout(resolve, this.POLL_INTERVAL));
      }

      // Wait for any remaining LLM (Large Language Model) requests to complete
      const finalActivePromises = this.model.getAllActivePromises();
      if (finalActivePromises.length > 0) {
        this.logger.debug(
          `[Final Wait] Waiting for ${finalActivePromises.length} remaining LLM requests`,
        );
        await Promise.all(finalActivePromises);

        // Recheck if there are new LLM requests after the first wait
        const remainingPromises = this.model.getAllActivePromises();
        if (remainingPromises.length > 0) {
          this.logger.debug(
            `[Final Check] Waiting for ${remainingPromises.length} additional LLM requests`,
          );
          await Promise.all(remainingPromises);
        }
      }

      this.logger.log(`[Sequence Complete] ${this.sequence.id}`);
      this.logger.debug('Final execution state:', this.executionState);
    } finally {
      // End the monitoring of the sequence once all nodes are executed
      this.monitor.endSequenceExecution(
        this.sequence.id,
        this.globalContext.get('projectUUID'),
      );
    }
  }

  /**
   * Checks if a node's dependencies have been satisfied.
   * Each handler may have a set of dependencies that must be completed before the node can run.
   * @param node The node whose dependencies need to be checked.
   * @returns True if all dependencies are met, otherwise false.
   */
  private checkNodeDependencies(node: BuildNode): boolean {
    const handlerClass = this.handlerManager.getHandler(node.handler);

    // If the node has no dependencies, it's ready to execute
    if (!handlerClass.dependencies?.length) {
      return true;
    }

    // Check each dependency for the node
    for (const dep of handlerClass.dependencies) {
      if (!this.executionState.completed.has(dep.name)) {
        return false;
      }
    }

    // All dependencies are met, so the node can execute
    this.logger.debug(`All dependencies met for ${node.handler.name}`);
    return true;
  }
}
